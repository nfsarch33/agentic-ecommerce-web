export type EventType =
  | "product.created"
  | "product.updated"
  | "order.placed"
  | "sync.completed"
  | "agent.run.completed"
  | "compliance.checked";

export type EventSeverity = "info" | "warning" | "error";

export interface EventItem {
  readonly id: string;
  readonly type: EventType;
  readonly severity: EventSeverity;
  readonly message: string;
  readonly occurredAt: string;
  readonly metadata?: Record<string, unknown>;
}

const eventTypeLabels: Record<EventType, string> = {
  "product.created": "Product Created",
  "product.updated": "Product Updated",
  "order.placed": "Order Placed",
  "sync.completed": "Sync Completed",
  "agent.run.completed": "Agent Run Completed",
  "compliance.checked": "Compliance Checked",
};

export function eventTypeLabel(type: EventType): string {
  return eventTypeLabels[type];
}

const severityToneMap: Record<EventSeverity, "gray" | "amber" | "red"> = {
  info: "gray",
  warning: "amber",
  error: "red",
};

export function eventSeverityTone(severity: EventSeverity): "gray" | "amber" | "red" {
  return severityToneMap[severity];
}

export function filterEventsByType(
  events: readonly EventItem[],
  type: EventType,
): readonly EventItem[] {
  return events.filter((e) => e.type === type);
}
