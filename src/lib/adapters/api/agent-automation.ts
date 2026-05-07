import {
  createAgentSchedule,
  createPricingRecommendation,
  createPricingStrategy,
  createSourcingRecommendation,
  type AgentSchedule,
  type AgentScheduleFrequency,
  type PricingRecommendation,
  type PricingStrategy,
  type PricingStrategyType,
  type SourcingRecommendation,
  type SourcingRecommendationStatus,
} from "@/lib/domain/agent-automation";
import type { components } from "./generated/schema";

type BackendAgentSchedule = components["schemas"]["AgentSchedule"];
type BackendAgentScheduleResponse = components["schemas"]["AgentScheduleResponse"];
type BackendAgentSchedulesResponse = components["schemas"]["AgentSchedulesResponse"];

export type SourcingDecision = "approve" | "reject" | "adjust";

export interface FetchAgentAutomationOptions {
  readonly baseUrl: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface DecideSourcingRecommendationOptions extends FetchAgentAutomationOptions {
  readonly recommendationId: string;
  readonly decision: SourcingDecision;
  readonly candidateId?: string;
  readonly adjustedUnitCostCents?: number;
  readonly note?: string;
}

export interface UpdatePricingStrategyOptions extends FetchAgentAutomationOptions {
  readonly strategyId: string;
  readonly enabled?: boolean;
  readonly targetMarginPercent?: number;
  readonly minMarginPercent?: number;
  readonly maxPriceCents?: number;
  readonly minPriceCents?: number;
}

export interface UpdateAgentScheduleOptions extends FetchAgentAutomationOptions {
  readonly scheduleId: string;
  readonly enabled?: boolean;
  readonly frequency?: AgentScheduleFrequency;
  readonly cronExpression?: string;
  readonly timezone?: string;
  readonly parameters?: Readonly<Record<string, unknown>>;
}

export class AgentAutomationApiError extends Error {
  override readonly name = "AgentAutomationApiError";
  override readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.cause = cause;
  }
}

interface RawSourcingCandidate {
  readonly id?: unknown;
  readonly supplier_name?: unknown;
  readonly product_name?: unknown;
  readonly sku?: unknown;
  readonly unit_cost_cents?: unknown;
  readonly currency?: unknown;
  readonly min_order_quantity?: unknown;
  readonly lead_time_days?: unknown;
  readonly reliability_score?: unknown;
  readonly margin_percent?: unknown;
  readonly supplier_url?: unknown;
  readonly notes?: unknown;
}

interface RawSourcingRecommendation {
  readonly id?: unknown;
  readonly product_id?: unknown;
  readonly product_title?: unknown;
  readonly status?: unknown;
  readonly candidates?: unknown;
  readonly recommended_candidate_id?: unknown;
  readonly rationale?: unknown;
  readonly confidence?: unknown;
  readonly workflow_id?: unknown;
  readonly created_at?: unknown;
  readonly updated_at?: unknown;
}

interface RawPricingStrategy {
  readonly id?: unknown;
  readonly name?: unknown;
  readonly strategy?: unknown;
  readonly enabled?: unknown;
  readonly target_margin_percent?: unknown;
  readonly min_margin_percent?: unknown;
  readonly max_price_cents?: unknown;
  readonly min_price_cents?: unknown;
  readonly competitors_tracked?: unknown;
  readonly updated_at?: unknown;
}

interface RawPricingRecommendation {
  readonly id?: unknown;
  readonly product_id?: unknown;
  readonly product_title?: unknown;
  readonly current_price_cents?: unknown;
  readonly recommended_price_cents?: unknown;
  readonly currency?: unknown;
  readonly expected_margin_percent?: unknown;
  readonly strategy_id?: unknown;
  readonly rationale?: unknown;
  readonly status?: unknown;
  readonly workflow_id?: unknown;
  readonly created_at?: unknown;
}

type RawAgentSchedule = Partial<BackendAgentSchedule> & {
  readonly id?: unknown;
  readonly agent_id?: unknown;
  readonly agent_name?: unknown;
  readonly enabled?: unknown;
  readonly frequency?: unknown;
  readonly cron_expression?: unknown;
  readonly cron?: unknown;
  readonly interval_seconds?: unknown;
  readonly priority?: unknown;
  readonly timezone?: unknown;
  readonly parameters?: unknown;
  readonly payload?: unknown;
  readonly next_run_at?: unknown;
  readonly workflow_id?: unknown;
  readonly updated_at?: unknown;
};

function apiUrl(baseUrl: string, path: string): string {
  if (!baseUrl) throw new AgentAutomationApiError("agent automation API: baseUrl is required");
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function stringFrom(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parametersFrom(value: unknown): Readonly<Record<string, unknown>> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Readonly<Record<string, unknown>>;
  }
  return {};
}

function scheduleFrequencyFrom(raw: RawAgentSchedule): AgentScheduleFrequency {
  if (typeof raw.frequency === "string" && raw.frequency !== "") {
    return raw.frequency as AgentScheduleFrequency;
  }
  if (typeof raw.cron === "string" && raw.cron.trim() !== "") {
    return "custom";
  }
  switch (raw.interval_seconds) {
    case 3600:
      return "hourly";
    case 86400:
      return "daily";
    case 604800:
      return "weekly";
    default:
      return "custom";
  }
}

function scheduleAgentNameFrom(raw: RawAgentSchedule): string {
  if (typeof raw.agent_name === "string" && raw.agent_name !== "") return raw.agent_name;
  const agentId = stringFrom(raw.agent_id);
  switch (agentId) {
    case "sourcing":
    case "agent_sourcing":
      return "Sourcing Agent";
    case "pricing":
    case "agent_pricing":
      return "Pricing Agent";
    case "compliance":
    case "agent_compliance":
      return "Compliance Agent";
    default:
      return agentId || "Agent";
  }
}

function mapCandidate(raw: RawSourcingCandidate) {
  return {
    id: stringFrom(raw.id),
    supplierName: stringFrom(raw.supplier_name),
    productName: stringFrom(raw.product_name),
    sku: optionalString(raw.sku),
    unitCostCents: Number(raw.unit_cost_cents),
    currency: stringFrom(raw.currency),
    minOrderQuantity: Number(raw.min_order_quantity),
    leadTimeDays: Number(raw.lead_time_days),
    reliabilityScore: Number(raw.reliability_score),
    marginPercent: Number(raw.margin_percent),
    supplierUrl: optionalString(raw.supplier_url),
    notes: optionalString(raw.notes),
  };
}

function mapSourcingRecommendation(raw: RawSourcingRecommendation): SourcingRecommendation {
  if (!Array.isArray(raw.candidates)) {
    throw new AgentAutomationApiError(
      "sourcing recommendation response must include candidates array",
    );
  }
  return createSourcingRecommendation({
    id: stringFrom(raw.id),
    productId: stringFrom(raw.product_id),
    productTitle: stringFrom(raw.product_title),
    status: stringFrom(raw.status) as SourcingRecommendationStatus,
    candidates: raw.candidates.map((candidate) => mapCandidate(candidate as RawSourcingCandidate)),
    recommendedCandidateId: optionalString(raw.recommended_candidate_id),
    rationale: stringFrom(raw.rationale),
    confidence: Number(raw.confidence),
    workflowId: optionalString(raw.workflow_id),
    createdAt: stringFrom(raw.created_at),
    updatedAt: stringFrom(raw.updated_at),
  });
}

function mapPricingStrategy(raw: RawPricingStrategy): PricingStrategy {
  return createPricingStrategy({
    id: stringFrom(raw.id),
    name: stringFrom(raw.name),
    strategy: stringFrom(raw.strategy) as PricingStrategyType,
    enabled: Boolean(raw.enabled),
    targetMarginPercent: Number(raw.target_margin_percent),
    minMarginPercent: Number(raw.min_margin_percent),
    maxPriceCents: optionalNumber(raw.max_price_cents),
    minPriceCents: optionalNumber(raw.min_price_cents),
    competitorsTracked: optionalNumber(raw.competitors_tracked),
    updatedAt: stringFrom(raw.updated_at),
  });
}

function mapPricingRecommendation(raw: RawPricingRecommendation): PricingRecommendation {
  return createPricingRecommendation({
    id: stringFrom(raw.id),
    productId: stringFrom(raw.product_id),
    productTitle: stringFrom(raw.product_title),
    currentPriceCents: Number(raw.current_price_cents),
    recommendedPriceCents: Number(raw.recommended_price_cents),
    currency: stringFrom(raw.currency),
    expectedMarginPercent: Number(raw.expected_margin_percent),
    strategyId: stringFrom(raw.strategy_id),
    rationale: stringFrom(raw.rationale),
    status: stringFrom(raw.status) as PricingRecommendation["status"],
    workflowId: optionalString(raw.workflow_id),
    createdAt: stringFrom(raw.created_at),
  });
}

function mapSchedule(raw: RawAgentSchedule): AgentSchedule {
  return createAgentSchedule({
    id: stringFrom(raw.id),
    agentId: stringFrom(raw.agent_id),
    agentName: scheduleAgentNameFrom(raw),
    enabled: Boolean(raw.enabled),
    frequency: scheduleFrequencyFrom(raw),
    cronExpression: optionalString(raw.cron_expression ?? raw.cron),
    timezone: stringFrom(raw.timezone) || "UTC",
    parameters: parametersFrom(raw.parameters ?? raw.payload),
    nextRunAt: optionalString(raw.next_run_at),
    workflowId: optionalString(raw.workflow_id),
    updatedAt: stringFrom(raw.updated_at),
  });
}

async function readJson(res: Response, label: string): Promise<unknown> {
  if (!res.ok) throw new AgentAutomationApiError(`${label}: HTTP ${res.status}`);
  try {
    return await res.json();
  } catch (err) {
    throw new AgentAutomationApiError(`${label}: invalid JSON`, err);
  }
}

function wrapContract<T>(label: string, fn: () => T): T {
  try {
    return fn();
  } catch (err) {
    if (err instanceof AgentAutomationApiError) throw err;
    throw new AgentAutomationApiError(`${label}: malformed response`, err);
  }
}

async function requestJson(
  opts: FetchAgentAutomationOptions,
  path: string,
  init: RequestInit,
  label: string,
) {
  const fetchImpl = opts.fetchImpl ?? fetch;
  try {
    const headers = { accept: "application/json", ...init.headers };
    return await fetchImpl(apiUrl(opts.baseUrl, path), {
      ...init,
      headers,
      signal: opts.signal,
    });
  } catch (err) {
    throw new AgentAutomationApiError(`${label}: network error`, err);
  }
}

export async function fetchSourcingRecommendations(
  opts: FetchAgentAutomationOptions,
): Promise<SourcingRecommendation[]> {
  const res = await requestJson(
    opts,
    "/api/v1/agents/sourcing/recommendations",
    { method: "GET" },
    "fetchSourcingRecommendations",
  );
  const body = (await readJson(res, "fetchSourcingRecommendations")) as {
    recommendations?: unknown;
  };
  if (!Array.isArray(body.recommendations)) {
    throw new AgentAutomationApiError(
      "fetchSourcingRecommendations: response body must include recommendations array",
    );
  }
  const recommendations = body.recommendations as unknown[];
  return wrapContract("fetchSourcingRecommendations", () =>
    recommendations.map((recommendation) =>
      mapSourcingRecommendation(recommendation as RawSourcingRecommendation),
    ),
  );
}

export async function decideSourcingRecommendation(
  opts: DecideSourcingRecommendationOptions,
): Promise<SourcingRecommendation> {
  if (!opts.recommendationId)
    throw new AgentAutomationApiError("decideSourcingRecommendation: recommendationId is required");
  const res = await requestJson(
    opts,
    `/api/v1/agents/sourcing/recommendations/${encodeURIComponent(opts.recommendationId)}/decision`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        decision: opts.decision,
        candidate_id: opts.candidateId,
        adjusted_unit_cost_cents: opts.adjustedUnitCostCents,
        note: opts.note,
      }),
    },
    "decideSourcingRecommendation",
  );
  const body = (await readJson(res, "decideSourcingRecommendation")) as {
    recommendation?: unknown;
  };
  if (!body.recommendation) {
    throw new AgentAutomationApiError(
      "decideSourcingRecommendation: response body must include recommendation",
    );
  }
  return wrapContract("decideSourcingRecommendation", () =>
    mapSourcingRecommendation(body.recommendation as RawSourcingRecommendation),
  );
}

export async function fetchPricingStrategies(
  opts: FetchAgentAutomationOptions,
): Promise<PricingStrategy[]> {
  const res = await requestJson(
    opts,
    "/api/v1/agents/pricing/strategies",
    { method: "GET" },
    "fetchPricingStrategies",
  );
  const body = (await readJson(res, "fetchPricingStrategies")) as { strategies?: unknown };
  if (!Array.isArray(body.strategies)) {
    throw new AgentAutomationApiError(
      "fetchPricingStrategies: response body must include strategies array",
    );
  }
  const strategies = body.strategies as unknown[];
  return wrapContract("fetchPricingStrategies", () =>
    strategies.map((strategy) => mapPricingStrategy(strategy as RawPricingStrategy)),
  );
}

export async function updatePricingStrategy(
  opts: UpdatePricingStrategyOptions,
): Promise<PricingStrategy> {
  if (!opts.strategyId)
    throw new AgentAutomationApiError("updatePricingStrategy: strategyId is required");
  const res = await requestJson(
    opts,
    `/api/v1/agents/pricing/strategies/${encodeURIComponent(opts.strategyId)}`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        enabled: opts.enabled,
        target_margin_percent: opts.targetMarginPercent,
        min_margin_percent: opts.minMarginPercent,
        max_price_cents: opts.maxPriceCents,
        min_price_cents: opts.minPriceCents,
      }),
    },
    "updatePricingStrategy",
  );
  const body = (await readJson(res, "updatePricingStrategy")) as { strategy?: unknown };
  if (!body.strategy)
    throw new AgentAutomationApiError("updatePricingStrategy: response body must include strategy");
  return wrapContract("updatePricingStrategy", () =>
    mapPricingStrategy(body.strategy as RawPricingStrategy),
  );
}

export async function fetchPricingRecommendations(
  opts: FetchAgentAutomationOptions,
): Promise<PricingRecommendation[]> {
  const res = await requestJson(
    opts,
    "/api/v1/agents/pricing/recommendations",
    { method: "GET" },
    "fetchPricingRecommendations",
  );
  const body = (await readJson(res, "fetchPricingRecommendations")) as {
    recommendations?: unknown;
  };
  if (!Array.isArray(body.recommendations)) {
    throw new AgentAutomationApiError(
      "fetchPricingRecommendations: response body must include recommendations array",
    );
  }
  const recommendations = body.recommendations as unknown[];
  return wrapContract("fetchPricingRecommendations", () =>
    recommendations.map((recommendation) =>
      mapPricingRecommendation(recommendation as RawPricingRecommendation),
    ),
  );
}

export async function fetchAgentSchedules(
  opts: FetchAgentAutomationOptions,
): Promise<AgentSchedule[]> {
  const res = await requestJson(
    opts,
    "/api/v1/agent-schedules",
    { method: "GET" },
    "fetchAgentSchedules",
  );
  const body = (await readJson(res, "fetchAgentSchedules")) as BackendAgentSchedulesResponse;
  if (!Array.isArray(body.schedules)) {
    throw new AgentAutomationApiError(
      "fetchAgentSchedules: response body must include schedules array",
    );
  }
  const schedules = body.schedules as unknown[];
  return wrapContract("fetchAgentSchedules", () =>
    schedules.map((schedule) => mapSchedule(schedule as RawAgentSchedule)),
  );
}

export async function updateAgentSchedule(
  opts: UpdateAgentScheduleOptions,
): Promise<AgentSchedule> {
  if (!opts.scheduleId)
    throw new AgentAutomationApiError("updateAgentSchedule: scheduleId is required");
  if (opts.enabled === undefined) {
    throw new AgentAutomationApiError(
      "updateAgentSchedule: enabled is required by backend contract",
    );
  }
  const action = opts.enabled ? "enable" : "disable";
  const res = await requestJson(
    opts,
    `/api/v1/agent-schedules/${encodeURIComponent(opts.scheduleId)}/${action}`,
    {
      method: "POST",
    },
    "updateAgentSchedule",
  );
  const body = (await readJson(res, "updateAgentSchedule")) as BackendAgentScheduleResponse;
  if (!body.schedule)
    throw new AgentAutomationApiError("updateAgentSchedule: response body must include schedule");
  return wrapContract("updateAgentSchedule", () => mapSchedule(body.schedule as RawAgentSchedule));
}
