import type {
  AgentKind,
  AgentRun,
  AgentRunTrigger,
  AgentStatus,
  AgentSummary,
} from "@/lib/domain/agent";

export interface FetchAgentsOptions {
  readonly baseUrl: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface TriggerAgentRunOptions {
  readonly baseUrl: string;
  readonly agentId: string;
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

interface RawAgentSummary {
  readonly id?: unknown;
  readonly kind?: unknown;
  readonly name?: unknown;
  readonly description?: unknown;
  readonly status?: unknown;
  readonly last_run_at?: unknown;
  readonly next_run_at?: unknown;
  readonly last_run_status?: unknown;
  readonly in_flight_runs?: unknown;
  readonly queued_runs?: unknown;
  readonly success_rate?: unknown;
  readonly updated_at?: unknown;
}

interface RawAgentRun {
  readonly id?: unknown;
  readonly agent_id?: unknown;
  readonly status?: unknown;
  readonly trigger?: unknown;
  readonly started_at?: unknown;
  readonly finished_at?: unknown;
  readonly duration_ms?: unknown;
  readonly summary?: unknown;
  readonly error?: unknown;
  readonly input?: unknown;
  readonly output?: unknown;
  readonly created_at?: unknown;
}

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
  "disabled",
]);
const runTriggers = new Set<AgentRunTrigger>(["manual", "scheduled", "event"]);

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

function parseNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new AgentsApiError(`${label} must be a non-negative number`);
  }
  return value;
}

function parseOptionalNumber(value: unknown, label: string): number | undefined {
  if (value === undefined || value === null) return undefined;
  return parseNumber(value, label);
}

function parseSuccessRate(value: unknown): number {
  const rate = parseNumber(value, "agent.success_rate");
  if (rate > 1) throw new AgentsApiError("agent.success_rate must be between 0 and 1");
  return rate;
}

function parseKind(value: unknown): AgentKind {
  const normalized = typeof value === "string" ? value.trim() : value;
  if (typeof normalized !== "string" || !agentKinds.has(normalized as AgentKind)) {
    throw new AgentsApiError("agent.kind is invalid");
  }
  return normalized as AgentKind;
}

function parseStatus(value: unknown, label: string): AgentStatus {
  if (typeof value !== "string" || !agentStatuses.has(value as AgentStatus)) {
    throw new AgentsApiError(`${label} is invalid`);
  }
  return value as AgentStatus;
}

function parseOptionalStatus(value: unknown, label: string): AgentStatus | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return parseStatus(value, label);
}

function parseTrigger(value: unknown): AgentRunTrigger {
  if (typeof value !== "string" || !runTriggers.has(value as AgentRunTrigger)) {
    throw new AgentsApiError("agent.run.trigger is invalid");
  }
  return value as AgentRunTrigger;
}

function parseAgent(raw: unknown): AgentSummary {
  const value = raw as RawAgentSummary;
  return {
    id: parseString(value?.id, "agent.id"),
    kind: parseKind(value?.kind),
    name: parseString(value?.name, "agent.name"),
    description: parseOptionalString(value?.description, "agent.description"),
    status: parseStatus(value?.status, "agent.status"),
    lastRunAt: parseOptionalString(value?.last_run_at, "agent.last_run_at"),
    nextRunAt: parseOptionalString(value?.next_run_at, "agent.next_run_at"),
    lastRunStatus: parseOptionalStatus(value?.last_run_status, "agent.last_run_status"),
    inFlightRuns: parseNumber(value?.in_flight_runs, "agent.in_flight_runs"),
    queuedRuns: parseNumber(value?.queued_runs, "agent.queued_runs"),
    successRate: parseSuccessRate(value?.success_rate),
    updatedAt: parseString(value?.updated_at, "agent.updated_at"),
  };
}

function parseRun(raw: unknown): AgentRun {
  const value = raw as RawAgentRun;
  return {
    id: parseString(value?.id, "agent.run.id"),
    agentId: parseString(value?.agent_id, "agent.run.agent_id"),
    status: parseStatus(value?.status, "agent.run.status"),
    trigger: parseTrigger(value?.trigger),
    startedAt: parseOptionalString(value?.started_at, "agent.run.started_at"),
    finishedAt: parseOptionalString(value?.finished_at, "agent.run.finished_at"),
    durationMs: parseOptionalNumber(value?.duration_ms, "agent.run.duration_ms"),
    summary: parseOptionalString(value?.summary, "agent.run.summary"),
    error: parseOptionalString(value?.error, "agent.run.error"),
    input: value?.input,
    output: value?.output,
    createdAt: parseString(value?.created_at, "agent.run.created_at"),
  };
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
  let res: Response;
  try {
    res = await fetchImpl(
      apiUrl(opts.baseUrl, `/api/v1/agents/${encodeURIComponent(opts.agentId)}/run`),
      {
        method: "POST",
        headers: { accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify({ trigger: "manual" }),
        signal: opts.signal,
      },
    );
  } catch (err) {
    throw new AgentsApiError("triggerAgentRun: network error", err);
  }
  const raw = (await readJson(res, "triggerAgentRun")) as RawRunResponse | RawAgentRun;
  return parseRun("run" in raw ? raw.run : raw);
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
