import type {
  AgentKind,
  AgentRun,
  AgentRunTrigger,
  AgentStatus,
  AgentSummary,
} from "@/lib/domain/agent";
import type { components } from "@/lib/adapters/api/generated/schema";

export interface FetchAgentsOptions {
  readonly baseUrl: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface TriggerAgentRunOptions {
  readonly baseUrl: string;
  readonly agentId: string;
  readonly priority?: number;
  readonly payload?: Record<string, unknown>;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface FetchAgentHistoryOptions {
  readonly baseUrl: string;
  readonly agentId: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export class AgentsApiError extends Error {
  override readonly name = "AgentsApiError";
  override readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.cause = cause;
  }
}

type ApiAgentDescriptor = components["schemas"]["AgentDescriptor"];
type ApiAgentRun = components["schemas"]["AgentRun"];
type ApiAgentRunRequest = components["schemas"]["AgentRunRequest"];

interface RawAgentsResponse {
  readonly agents?: unknown;
}

interface RawRunsResponse {
  readonly runs?: unknown;
}

interface RawRunResponse {
  readonly run?: unknown;
}

const agentKinds = new Set<AgentKind>(["sourcing", "content", "pricing", "compliance"]);
const agentStatuses = new Set<AgentStatus>([
  "idle",
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled",
  "disabled",
]);
const runTriggers = new Set<AgentRunTrigger>(["manual", "scheduled", "event"]);
const epoch = "1970-01-01T00:00:00.000Z";

function apiUrl(baseUrl: string, path: string): string {
  if (!baseUrl) throw new AgentsApiError("agents API: baseUrl is required");
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

function parseString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new AgentsApiError(`${label} must be a non-empty string`);
  }
  return value;
}

function parseOptionalString(value: unknown, label: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return parseString(value, label);
}

function parseKind(value: unknown): AgentKind {
  if (typeof value !== "string" || !agentKinds.has(value as AgentKind)) {
    throw new AgentsApiError("agent.kind is invalid");
  }
  return value as AgentKind;
}

function parseStatus(value: unknown, label: string): AgentStatus {
  if (typeof value !== "string" || !agentStatuses.has(value as AgentStatus)) {
    throw new AgentsApiError(`${label} is invalid`);
  }
  return value as AgentStatus;
}

function parseTrigger(value: unknown): AgentRunTrigger {
  if (typeof value !== "string" || !runTriggers.has(value as AgentRunTrigger)) {
    throw new AgentsApiError("agent.run.trigger is invalid");
  }
  return value as AgentRunTrigger;
}

function parseAgent(raw: unknown): AgentSummary {
  const value = raw as Partial<ApiAgentDescriptor>;
  const id = parseString(value?.id, "agent.id");
  return {
    id,
    kind: parseKind(id),
    name: parseString(value?.name, "agent.name"),
    description: parseOptionalString(value?.description, "agent.description"),
    status: "idle",
    inFlightRuns: 0,
    queuedRuns: 0,
    successRate: 1,
    updatedAt: epoch,
  };
}

function parseRun(raw: unknown): AgentRun {
  const value = raw as Partial<ApiAgentRun>;
  const status = parseStatus(value?.state, "agent.run.state");
  const startedAt = parseOptionalString(value?.started_at, "agent.run.started_at");
  const finishedAt = parseOptionalString(value?.finished_at, "agent.run.finished_at");
  return {
    id: parseString(value?.id, "agent.run.id"),
    agentId: parseString(value?.agent_id, "agent.run.agent_id"),
    status,
    trigger: parseTrigger("manual"),
    startedAt,
    finishedAt,
    durationMs: durationMs(startedAt, finishedAt),
    summary: summarizeRun(status, value),
    error: formatRunError(value?.error),
    input: value?.input,
    output: value?.result,
    createdAt: parseString(value?.created_at, "agent.run.created_at"),
  };
}

function durationMs(startedAt?: string, finishedAt?: string): number | undefined {
  if (!startedAt || !finishedAt) return undefined;
  const started = Date.parse(startedAt);
  const finished = Date.parse(finishedAt);
  if (!Number.isFinite(started) || !Number.isFinite(finished) || finished < started) return undefined;
  return finished - started;
}

function summarizeRun(status: AgentStatus, run: Partial<ApiAgentRun>): string {
  if (status === "queued") return "Run queued.";
  if (status === "running") return "Run in progress.";
  const error = formatRunError(run.error);
  if (error) return error;
  const keys = Object.keys(run.result ?? {}).sort();
  if (keys.length === 0) return `Run ${status}.`;
  return `Completed with result: ${keys.join(", ")}.`;
}

function formatRunError(error: ApiAgentRun["error"] | undefined): string | undefined {
  if (!error?.code && !error?.detail) return undefined;
  return error.detail ? `${error.code ?? "agent_error"}: ${error.detail}` : error.code;
}

function defaultPayloadForAgent(agentId: string): Record<string, unknown> {
  switch (agentId) {
    case "sourcing":
      return {
        candidates: [
          {
            supplier_id: "qa-supplier",
            sku: "RB-SET",
            unit_cost_cents: 1200,
            shipping_cents: 250,
            estimated_sell_price_cents: 3495,
            lead_time_days: 7,
            reliability_score: 0.92,
            demand_score: 0.81,
            competition_score: 0.3,
          },
        ],
      };
    case "pricing":
      return {
        sku: "RB-SET",
        cost_cents: 1800,
        shipping_cents: 250,
        current_price_cents: 4995,
        competitor_prices_cents: [4595, 4895, 5195],
        target_margin_pct: 0.45,
        minimum_margin_pct: 0.32,
      };
    case "compliance":
      return {
        product: {
          ID: "qa-product",
          SKU: "RB-SET",
          Title: "Resistance Band Set",
          Description: "Resistance bands for training and mobility.",
          Currency: "AUD",
        },
        output: {
          description:
            "Professional resistance training kit for home workouts, mobility drills, and progressive strength routines.",
          seo_title: "Resistance Training Kit",
          meta_description: "A professional resistance training kit for home workouts and mobility drills.",
        },
        style: "professional",
        max_words: 80,
        keywords: ["resistance", "training"],
      };
    default:
      return {};
  }
}

async function readJson(res: Response, label: string): Promise<unknown> {
  if (!res.ok) {
    throw new AgentsApiError(`${label}: HTTP ${res.status}`);
  }
  try {
    return await res.json();
  } catch (err) {
    throw new AgentsApiError(`${label}: invalid JSON`, err);
  }
}

function isRunWrapper(raw: unknown): raw is RawRunResponse {
  return typeof raw === "object" && raw !== null && "run" in raw;
}

export async function fetchAgents(opts: FetchAgentsOptions): Promise<AgentSummary[]> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(apiUrl(opts.baseUrl, "/api/v1/agents"), {
      method: "GET",
      headers: { accept: "application/json" },
      signal: opts.signal,
    });
  } catch (err) {
    throw new AgentsApiError("fetchAgents: network error", err);
  }
  const raw = (await readJson(res, "fetchAgents")) as RawAgentsResponse;
  if (!Array.isArray(raw.agents)) {
    throw new AgentsApiError("fetchAgents: response body must include agents array");
  }
  return raw.agents.map(parseAgent);
}

export async function triggerAgentRun(opts: TriggerAgentRunOptions): Promise<AgentRun> {
  if (!opts.agentId) throw new AgentsApiError("triggerAgentRun: agentId is required");
  const fetchImpl = opts.fetchImpl ?? fetch;
  const body: ApiAgentRunRequest = {
    priority: opts.priority ?? 0,
    payload: opts.payload ?? defaultPayloadForAgent(opts.agentId),
  };
  let res: Response;
  try {
    res = await fetchImpl(
      apiUrl(opts.baseUrl, `/api/v1/agents/${encodeURIComponent(opts.agentId)}/run`),
      {
        method: "POST",
        headers: { accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: opts.signal,
      },
    );
  } catch (err) {
    throw new AgentsApiError("triggerAgentRun: network error", err);
  }
  const raw = await readJson(res, "triggerAgentRun");
  return parseRun(isRunWrapper(raw) ? raw.run : raw);
}

export async function fetchAgentHistory(opts: FetchAgentHistoryOptions): Promise<AgentRun[]> {
  if (!opts.agentId) throw new AgentsApiError("fetchAgentHistory: agentId is required");
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(
      apiUrl(opts.baseUrl, `/api/v1/agents/${encodeURIComponent(opts.agentId)}/history`),
      {
        method: "GET",
        headers: { accept: "application/json" },
        signal: opts.signal,
      },
    );
  } catch (err) {
    throw new AgentsApiError("fetchAgentHistory: network error", err);
  }
  const raw = (await readJson(res, "fetchAgentHistory")) as RawRunsResponse;
  if (!Array.isArray(raw.runs)) {
    throw new AgentsApiError("fetchAgentHistory: response body must include runs array");
  }
  return raw.runs.map(parseRun);
}
