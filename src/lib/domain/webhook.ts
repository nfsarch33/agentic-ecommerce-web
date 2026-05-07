export type WebhookEventType =
  | "product.created"
  | "product.updated"
  | "order.placed"
  | "sync.completed"
  | "agent.run.completed"
  | "compliance.checked";

export type WebhookDeliveryStatus = "pending" | "delivered" | "failed";
export type AutomationStatusValue = "active" | "paused" | "failing" | "not_configured";
export type StatusTone = "blue" | "amber" | "green" | "red" | "gray";

export interface WebhookRegistration {
  readonly id: string;
  readonly url: string;
  readonly eventTypes: readonly WebhookEventType[];
  readonly description?: string;
  readonly secretConfigured: boolean;
  readonly active: boolean;
  readonly createdAt: string;
  readonly updatedAt?: string;
  readonly lastDeliveryAt?: string;
  readonly failureCount?: number;
}

export interface WebhookDelivery {
  readonly id: string;
  readonly webhookId: string;
  readonly eventType: WebhookEventType;
  readonly status: WebhookDeliveryStatus;
  readonly responseStatus?: number;
  readonly attempt: number;
  readonly occurredAt: string;
  readonly nextRetryAt?: string;
  readonly error?: string;
}

export interface AutomationStatus {
  readonly id: string;
  readonly name: string;
  readonly eventType: WebhookEventType;
  readonly status: AutomationStatusValue;
  readonly description: string;
  readonly target: string;
  readonly lastDeliveryAt?: string;
  readonly lastDeliveryStatus?: WebhookDeliveryStatus;
}

export class WebhookDomainError extends Error {
  override readonly name = "WebhookDomainError";
}

export const supportedWebhookEventTypes: readonly WebhookEventType[] = [
  "product.created",
  "product.updated",
  "order.placed",
  "sync.completed",
  "agent.run.completed",
  "compliance.checked",
];

const eventTypes = new Set<WebhookEventType>(supportedWebhookEventTypes);
const deliveryStatuses = new Set<WebhookDeliveryStatus>(["pending", "delivered", "failed"]);

const exampleAutomations: readonly Omit<
  AutomationStatus,
  "status" | "target" | "lastDeliveryAt" | "lastDeliveryStatus"
>[] = [
  {
    id: "product-created-slack",
    name: "Product created -> Slack notification",
    eventType: "product.created",
    description: "Posts a product event to a Slack channel through n8n.",
  },
  {
    id: "order-placed-email",
    name: "Order placed -> email confirmation",
    eventType: "order.placed",
    description: "Sends an order confirmation email through n8n.",
  },
];

function parseString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new WebhookDomainError(`${label} must be a non-empty string`);
  }
  return value.trim();
}

function parseOptionalString(value: unknown, label: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") {
    throw new WebhookDomainError(`${label} must be a string when present`);
  }
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function parseOptionalNumber(value: unknown, label: string): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new WebhookDomainError(`${label} must be a finite number when present`);
  }
  return value;
}

function parseBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    throw new WebhookDomainError(`${label} must be a boolean`);
  }
  return value;
}

function parseEventType(value: unknown, label: string): WebhookEventType {
  if (typeof value !== "string" || !eventTypes.has(value as WebhookEventType)) {
    throw new WebhookDomainError(`${label} contains unsupported event: ${String(value)}`);
  }
  return value as WebhookEventType;
}

function parseDeliveryStatus(value: unknown): WebhookDeliveryStatus {
  if (typeof value !== "string" || !deliveryStatuses.has(value as WebhookDeliveryStatus)) {
    throw new WebhookDomainError(`delivery.status is invalid: ${String(value)}`);
  }
  return value as WebhookDeliveryStatus;
}

export function createWebhookRegistration(input: WebhookRegistration): WebhookRegistration {
  if (input.eventTypes.length === 0) {
    throw new WebhookDomainError("webhook.eventTypes must include at least one event");
  }

  return {
    id: parseString(input.id, "webhook.id"),
    url: parseString(input.url, "webhook.url"),
    eventTypes: input.eventTypes.map((eventType) =>
      parseEventType(eventType, "webhook.eventTypes"),
    ),
    description: parseOptionalString(input.description, "webhook.description"),
    secretConfigured: parseBoolean(input.secretConfigured, "webhook.secretConfigured"),
    active: parseBoolean(input.active, "webhook.active"),
    createdAt: parseString(input.createdAt, "webhook.createdAt"),
    updatedAt: parseOptionalString(input.updatedAt, "webhook.updatedAt"),
    lastDeliveryAt: parseOptionalString(input.lastDeliveryAt, "webhook.lastDeliveryAt"),
    failureCount: parseOptionalNumber(input.failureCount, "webhook.failureCount"),
  };
}

export function createWebhookDelivery(input: WebhookDelivery): WebhookDelivery {
  return {
    id: parseString(input.id, "delivery.id"),
    webhookId: parseString(input.webhookId, "delivery.webhookId"),
    eventType: parseEventType(input.eventType, "delivery.eventType"),
    status: parseDeliveryStatus(input.status),
    responseStatus: parseOptionalNumber(input.responseStatus, "delivery.responseStatus"),
    attempt: parseOptionalNumber(input.attempt, "delivery.attempt") ?? 1,
    occurredAt: parseString(input.occurredAt, "delivery.occurredAt"),
    nextRetryAt: parseOptionalString(input.nextRetryAt, "delivery.nextRetryAt"),
    error: parseOptionalString(input.error, "delivery.error"),
  };
}

export function webhookEventTypeLabel(eventType: WebhookEventType): string {
  switch (eventType) {
    case "order.placed":
      return "Order placed";
    case "product.created":
      return "Product created";
    case "product.updated":
      return "Product updated";
    case "sync.completed":
      return "Sync completed";
    case "agent.run.completed":
      return "Agent run completed";
    case "compliance.checked":
      return "Compliance checked";
  }
}

export function webhookDeliveryStatusLabel(status: WebhookDeliveryStatus): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "delivered":
      return "Delivered";
    case "failed":
      return "Failed";
  }
}

export function automationStatusLabel(status: AutomationStatusValue): string {
  switch (status) {
    case "active":
      return "Active";
    case "paused":
      return "Paused";
    case "failing":
      return "Failing";
    case "not_configured":
      return "Not configured";
  }
}

export function webhookStatusTone(
  webhook: Pick<WebhookRegistration, "active" | "failureCount">,
): StatusTone {
  if ((webhook.failureCount ?? 0) > 0) return "red";
  return webhook.active ? "green" : "gray";
}

export function automationStatusTone(status: AutomationStatusValue): StatusTone {
  switch (status) {
    case "active":
      return "green";
    case "paused":
      return "gray";
    case "failing":
      return "red";
    case "not_configured":
      return "amber";
  }
}

export function automationStatusesFromWebhooks(
  webhooks: readonly WebhookRegistration[],
): readonly AutomationStatus[] {
  return exampleAutomations.map((automation) => {
    const matching = webhooks.filter((webhook) =>
      webhook.eventTypes.includes(automation.eventType),
    );
    const active = matching.filter((webhook) => webhook.active);
    const latestDelivery = active.find((webhook) => webhook.lastDeliveryAt);
    const status: AutomationStatusValue =
      matching.length === 0
        ? "not_configured"
        : active.length === 0
          ? "paused"
          : active.some((webhook) => (webhook.failureCount ?? 0) > 0)
            ? "failing"
            : "active";

    return {
      ...automation,
      status,
      target: active[0]?.url ?? matching[0]?.url ?? "n8n",
      lastDeliveryAt: latestDelivery?.lastDeliveryAt,
      lastDeliveryStatus:
        status === "failing" ? "failed" : latestDelivery ? "delivered" : undefined,
    };
  });
}
