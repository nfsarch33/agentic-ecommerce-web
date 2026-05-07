import type { EventItem, EventSeverity, EventType } from "@/lib/domain/event";
import type { components } from "./generated/schema";

export interface FetchRecentEventsOptions {
  readonly baseUrl: string;
  readonly limit?: number;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export class EventsApiError extends Error {
  override readonly name = "EventsApiError";
  override readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.cause = cause;
  }
}

type RawEventItem = components["schemas"]["EventItem"];
type RawEventsResponse = components["schemas"]["RecentEventsResponse"];

const validEventTypes = new Set<EventType>([
  "product.created",
  "product.updated",
  "order.placed",
  "sync.completed",
  "agent.run.completed",
  "compliance.checked",
]);

const validSeverities = new Set<EventSeverity>(["info", "warning", "error"]);

function apiUrl(baseUrl: string, path: string): string {
  if (!baseUrl) throw new EventsApiError("events API: baseUrl is required");
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

function parseEventType(value: unknown): EventType {
  if (typeof value !== "string" || !validEventTypes.has(value as EventType)) {
    throw new EventsApiError(`event.type is invalid: ${String(value)}`);
  }
  return value as EventType;
}

function parseSeverity(value: unknown): EventSeverity {
  if (typeof value !== "string" || !validSeverities.has(value as EventSeverity)) {
    throw new EventsApiError(`event.severity is invalid: ${String(value)}`);
  }
  return value as EventSeverity;
}

function parseString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new EventsApiError(`${label} must be a non-empty string`);
  }
  return value;
}

function parseOptionalMetadata(value: unknown): Record<string, unknown> | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new EventsApiError("event.metadata must be an object if present");
  }
  return value as Record<string, unknown>;
}

function parseEvent(raw: unknown): EventItem {
  const value = raw as RawEventItem;
  return {
    id: parseString(value?.id, "event.id"),
    type: parseEventType(value?.type),
    severity: parseSeverity(value?.severity),
    message: parseString(value?.message, "event.message"),
    occurredAt: parseString(value?.occurred_at, "event.occurred_at"),
    metadata: parseOptionalMetadata(value?.metadata),
  };
}

export async function fetchRecentEvents(opts: FetchRecentEventsOptions): Promise<EventItem[]> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const limit = opts.limit ?? 20;
  const url = apiUrl(opts.baseUrl, `/api/v1/events/recent?limit=${limit}`);

  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: opts.signal,
    });
  } catch (err) {
    throw new EventsApiError("fetchRecentEvents: network error", err);
  }

  if (!res.ok) {
    throw new EventsApiError(`fetchRecentEvents: HTTP ${res.status}`);
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch (err) {
    throw new EventsApiError("fetchRecentEvents: invalid JSON", err);
  }

  const raw = body as RawEventsResponse;
  if (!Array.isArray(raw.events)) {
    throw new EventsApiError("fetchRecentEvents: response body must include events array");
  }

  return raw.events.map(parseEvent);
}
