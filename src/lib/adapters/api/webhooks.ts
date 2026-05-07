import {
  createWebhookDelivery,
  createWebhookRegistration,
  type WebhookDelivery,
  type WebhookEventType,
  type WebhookRegistration,
} from "@/lib/domain/webhook";
import type { components } from "./generated/schema";

export interface WebhookApiOptions {
  readonly baseUrl: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface CreateWebhookOptions extends WebhookApiOptions {
  readonly url: string;
  readonly eventTypes: readonly WebhookEventType[];
  readonly secret?: string;
  readonly enabled?: boolean;
}

export interface DeleteWebhookOptions extends WebhookApiOptions {
  readonly webhookId: string;
}

export interface SendTestWebhookOptions extends WebhookApiOptions {
  readonly webhookId: string;
  readonly eventType: WebhookEventType;
}

export class WebhooksApiError extends Error {
  override readonly name = "WebhooksApiError";
  override readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.cause = cause;
  }
}

type RawCreateWebhookRequest = Omit<
  components["schemas"]["CreateWebhookRequest"],
  "event_types"
> & {
  event_types: WebhookEventType[];
  description?: string;
  secret?: string;
  enabled?: boolean;
};
type RawWebhookRegistration = components["schemas"]["WebhookRegistration"] & {
  description?: unknown;
  secret_configured?: unknown;
  active?: unknown;
  updated_at?: unknown;
  last_delivery_at?: unknown;
  failure_count?: unknown;
};
type RawWebhookDelivery = components["schemas"]["WebhookDeliveryResult"] & {
  response_status?: unknown;
  attempt?: unknown;
  occurred_at?: unknown;
  next_retry_at?: unknown;
};

function apiUrl(baseUrl: string, path: string): string {
  if (!baseUrl) throw new WebhooksApiError("webhooks API: baseUrl is required");
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function mapWebhook(raw: RawWebhookRegistration): WebhookRegistration {
  if (!Array.isArray(raw.event_types)) {
    throw new WebhooksApiError("webhook response must include event_types array");
  }

  return createWebhookRegistration({
    id: String(raw.id ?? ""),
    url: String(raw.url ?? ""),
    eventTypes: raw.event_types.map((eventType) => String(eventType) as WebhookEventType),
    description: optionalString(raw.description),
    secretConfigured:
      Boolean(raw.secret_configured) ||
      (typeof raw.secret_hash === "string" && raw.secret_hash !== ""),
    active: raw.active !== false && raw.enabled !== false,
    createdAt: String(raw.created_at ?? ""),
    updatedAt: String(raw.updated_at ?? raw.created_at ?? ""),
    lastDeliveryAt: optionalString(raw.last_delivery_at),
    failureCount: optionalNumber(raw.failure_count),
  });
}

function mapDelivery(raw: RawWebhookDelivery): WebhookDelivery {
  return createWebhookDelivery({
    id: String(raw.id ?? ""),
    webhookId: String(raw.webhook_id ?? ""),
    eventType: String(raw.event_type ?? "") as WebhookEventType,
    status: (typeof raw.status === "string"
      ? raw.status
      : raw.success
        ? "delivered"
        : "failed") as WebhookDelivery["status"],
    responseStatus: optionalNumber(raw.response_status) ?? optionalNumber(raw.status),
    attempt: optionalNumber(raw.attempt) ?? optionalNumber(raw.attempts) ?? 1,
    occurredAt: String(raw.occurred_at ?? raw.created_at ?? ""),
    nextRetryAt: optionalString(raw.next_retry_at),
    error: optionalString(raw.error),
  });
}

async function readJson(res: Response, label: string): Promise<unknown> {
  try {
    return await res.json();
  } catch (err) {
    throw new WebhooksApiError(`${label}: invalid JSON`, err);
  }
}

export async function fetchWebhooks(opts: WebhookApiOptions): Promise<WebhookRegistration[]> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(apiUrl(opts.baseUrl, "/api/v1/webhooks"), {
      method: "GET",
      headers: { accept: "application/json" },
      signal: opts.signal,
    });
  } catch (err) {
    throw new WebhooksApiError("fetchWebhooks: network error", err);
  }
  if (!res.ok) throw new WebhooksApiError(`fetchWebhooks: HTTP ${res.status}`);

  const body = (await readJson(res, "fetchWebhooks")) as { webhooks?: unknown };
  if (!Array.isArray(body.webhooks)) {
    throw new WebhooksApiError("fetchWebhooks: response body must include webhooks array");
  }
  return body.webhooks.map((webhook) => mapWebhook(webhook as RawWebhookRegistration));
}

export async function createWebhook(opts: CreateWebhookOptions): Promise<WebhookRegistration> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    const body: RawCreateWebhookRequest = {
      url: opts.url,
      event_types: [...opts.eventTypes],
      secret: opts.secret ?? "",
      enabled: opts.enabled ?? true,
    };
    res = await fetchImpl(apiUrl(opts.baseUrl, "/api/v1/webhooks"), {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: opts.signal,
    });
  } catch (err) {
    throw new WebhooksApiError("createWebhook: network error", err);
  }
  if (!res.ok) throw new WebhooksApiError(`createWebhook: HTTP ${res.status}`);

  const body = (await readJson(res, "createWebhook")) as RawWebhookRegistration;
  return mapWebhook(body);
}

export async function deleteWebhook(opts: DeleteWebhookOptions): Promise<void> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const webhookId = encodeURIComponent(opts.webhookId);
  let res: Response;
  try {
    res = await fetchImpl(apiUrl(opts.baseUrl, `/api/v1/webhooks/${webhookId}`), {
      method: "DELETE",
      headers: { accept: "application/json" },
      signal: opts.signal,
    });
  } catch (err) {
    throw new WebhooksApiError("deleteWebhook: network error", err);
  }
  if (!res.ok) throw new WebhooksApiError(`deleteWebhook: HTTP ${res.status}`);
}

export async function sendTestWebhook(opts: SendTestWebhookOptions): Promise<WebhookDelivery> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const webhookId = encodeURIComponent(opts.webhookId);
  let res: Response;
  try {
    res = await fetchImpl(apiUrl(opts.baseUrl, `/api/v1/webhooks/${webhookId}/test`), {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({ event_type: opts.eventType }),
      signal: opts.signal,
    });
  } catch (err) {
    throw new WebhooksApiError("sendTestWebhook: network error", err);
  }
  if (!res.ok) throw new WebhooksApiError(`sendTestWebhook: HTTP ${res.status}`);

  const body = (await readJson(res, "sendTestWebhook")) as { delivery?: unknown };
  if (!body.delivery) {
    throw new WebhooksApiError("sendTestWebhook: response body must include delivery");
  }
  return mapDelivery(body.delivery as RawWebhookDelivery);
}
