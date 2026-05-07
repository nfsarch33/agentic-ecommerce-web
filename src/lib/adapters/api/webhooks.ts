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

type RawCreateWebhookRequest = components["schemas"]["CreateWebhookRequest"];
type RawWebhookRegistration = components["schemas"]["WebhookRegistration"];
type RawWebhookDelivery = components["schemas"]["WebhookDeliveryResult"];

function apiUrl(baseUrl: string, path: string): string {
  if (!baseUrl) throw new WebhooksApiError("webhooks API: baseUrl is required");
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

function mapWebhook(raw: RawWebhookRegistration): WebhookRegistration {
  if (!Array.isArray(raw.event_types)) {
    throw new WebhooksApiError("webhook response must include event_types array");
  }

  return createWebhookRegistration({
    id: String(raw.id ?? ""),
    url: String(raw.url ?? ""),
    eventTypes: raw.event_types.map((eventType) => String(eventType) as WebhookEventType),
    secretConfigured: typeof raw.secret_hash === "string" && raw.secret_hash !== "",
    active: raw.enabled,
    createdAt: String(raw.created_at ?? ""),
  });
}

function mapDelivery(raw: RawWebhookDelivery): WebhookDelivery {
  return createWebhookDelivery({
    id: String(raw.id ?? ""),
    webhookId: String(raw.webhook_id ?? ""),
    eventType: String(raw.event_type ?? "") as WebhookEventType,
    status: raw.success ? "delivered" : "failed",
    responseStatus: raw.status,
    attempt: raw.attempts,
    occurredAt: String(raw.created_at ?? ""),
    error: raw.error,
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
