// File scope: v3.6.0 EC-9-2 agent activity domain types.
//
// Mirrors the backend handler.AgentActivity envelope (see
// agentic-ecommerce/internal/api/handler/sse_agent_activity.go).
// Kept in src/lib/domain/ alongside the other domain types so the
// admin pages + tests share a single canonical shape.
//
// The backend ships a `dropped` SSE event when the per-client
// buffer overflows; we surface that as a synthetic activity entry
// so the operator sees the gap inline rather than silently losing
// history.

export type AgentActivityStatus =
  | "applied"
  | "pending_approval"
  | "changed"
  | "ok"
  | "placed"
  | "rolled_back"
  | "received"
  | "replied"
  | "escalated"
  | "dropped"
  | "unknown";

export interface AgentActivity {
  readonly id: string;
  readonly tenantId: string;
  readonly agentId: string;
  readonly action: string;
  readonly status: AgentActivityStatus;
  readonly timestamp: string;
  readonly details?: Record<string, unknown>;
}

// agentActivityKey returns a stable React key for an activity. The
// backend includes the timestamp + action; combined with the per-
// connection counter we get a key that survives StrictMode double
// renders.
export function agentActivityKey(activity: AgentActivity): string {
  return activity.id;
}

// agentActivityToneClass maps the closed-enum status to a
// Tailwind colour token. Pure function so the component body
// stays small + the mapping is testable in isolation.
export function agentActivityToneClass(status: AgentActivityStatus): string {
  switch (status) {
    case "applied":
    case "ok":
    case "placed":
    case "replied":
      return "bg-green-50 text-green-700";
    case "pending_approval":
    case "received":
      return "bg-blue-50 text-blue-700";
    case "rolled_back":
    case "escalated":
    case "dropped":
      return "bg-red-50 text-red-700";
    case "changed":
      return "bg-amber-50 text-amber-700";
    case "unknown":
    default:
      return "bg-gray-100 text-gray-700";
  }
}

// formatActivityTimestamp returns the operator-friendly local
// rendering. Pure function; tested separately so the component
// body stays small.
export function formatActivityTimestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(parsed);
}

// parseAgentActivity decodes the canonical JSON envelope into the
// domain shape. Returns undefined on malformed payloads so the
// receiver can ignore + emit a `dropped` synthetic.
export function parseAgentActivity(raw: string, idHint: string): AgentActivity | undefined {
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (typeof data.tenant_id !== "string") return undefined;
    return {
      id: idHint,
      tenantId: String(data.tenant_id),
      agentId: typeof data.agent_id === "string" ? data.agent_id : "unknown",
      action: typeof data.action === "string" ? data.action : "unknown",
      status: normaliseStatus(data.status),
      timestamp: typeof data.timestamp === "string" ? data.timestamp : new Date().toISOString(),
      details: typeof data.details === "object" && data.details !== null ? (data.details as Record<string, unknown>) : undefined,
    };
  } catch {
    return undefined;
  }
}

function normaliseStatus(raw: unknown): AgentActivityStatus {
  const known: AgentActivityStatus[] = [
    "applied",
    "pending_approval",
    "changed",
    "ok",
    "placed",
    "rolled_back",
    "received",
    "replied",
    "escalated",
    "dropped",
    "unknown",
  ];
  if (typeof raw === "string" && (known as string[]).includes(raw)) {
    return raw as AgentActivityStatus;
  }
  return "unknown";
}
