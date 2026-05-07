export type SourcingRecommendationStatus = "pending" | "approved" | "rejected" | "adjusted";
export type PricingStrategyType = "margin_based" | "competition_based" | "demand_based";
export type PricingRecommendationStatus = "pending" | "accepted" | "rejected" | "superseded";
export type AgentScheduleFrequency = "hourly" | "daily" | "weekly" | "custom";

export interface SourcingCandidate {
  readonly id: string;
  readonly supplierName: string;
  readonly productName: string;
  readonly sku?: string;
  readonly unitCostCents: number;
  readonly currency: string;
  readonly minOrderQuantity: number;
  readonly leadTimeDays: number;
  readonly reliabilityScore: number;
  readonly marginPercent: number;
  readonly supplierUrl?: string;
  readonly notes?: string;
}

export interface SourcingRecommendation {
  readonly id: string;
  readonly productId: string;
  readonly productTitle: string;
  readonly status: SourcingRecommendationStatus;
  readonly candidates: readonly SourcingCandidate[];
  readonly recommendedCandidateId?: string;
  readonly rationale: string;
  readonly confidence: number;
  readonly workflowId?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PricingStrategy {
  readonly id: string;
  readonly name: string;
  readonly strategy: PricingStrategyType;
  readonly enabled: boolean;
  readonly targetMarginPercent: number;
  readonly minMarginPercent: number;
  readonly maxPriceCents?: number;
  readonly minPriceCents?: number;
  readonly competitorsTracked?: number;
  readonly updatedAt: string;
}

export interface PricingRecommendation {
  readonly id: string;
  readonly productId: string;
  readonly productTitle: string;
  readonly currentPriceCents: number;
  readonly recommendedPriceCents: number;
  readonly currency: string;
  readonly expectedMarginPercent: number;
  readonly strategyId: string;
  readonly rationale: string;
  readonly status: PricingRecommendationStatus;
  readonly workflowId?: string;
  readonly createdAt: string;
}

export interface AgentSchedule {
  readonly id: string;
  readonly agentId: string;
  readonly agentName: string;
  readonly enabled: boolean;
  readonly frequency: AgentScheduleFrequency;
  readonly cronExpression?: string;
  readonly timezone: string;
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly nextRunAt?: string;
  readonly workflowId?: string;
  readonly updatedAt: string;
}

export class AgentAutomationDomainError extends Error {
  override readonly name = "AgentAutomationDomainError";
}

const sourcingStatuses = new Set<SourcingRecommendationStatus>([
  "pending",
  "approved",
  "rejected",
  "adjusted",
]);
const pricingStrategyTypes = new Set<PricingStrategyType>([
  "margin_based",
  "competition_based",
  "demand_based",
]);
const pricingRecommendationStatuses = new Set<PricingRecommendationStatus>([
  "pending",
  "accepted",
  "rejected",
  "superseded",
]);
const scheduleFrequencies = new Set<AgentScheduleFrequency>([
  "hourly",
  "daily",
  "weekly",
  "custom",
]);

function parseString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new AgentAutomationDomainError(`${label} must be a non-empty string`);
  }
  return value.trim();
}

function parseOptionalString(value: unknown, label: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return parseString(value, label);
}

function parseNonNegativeNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new AgentAutomationDomainError(`${label} must be a non-negative number`);
  }
  return value;
}

function parseOptionalNonNegativeNumber(value: unknown, label: string): number | undefined {
  if (value === undefined || value === null) return undefined;
  return parseNonNegativeNumber(value, label);
}

function parsePercent(value: unknown, label: string): number {
  const percent = parseNonNegativeNumber(value, label);
  if (percent > 100) throw new AgentAutomationDomainError(`${label} must be between 0 and 100`);
  return percent;
}

function parseUnitScore(value: unknown, label: string): number {
  const score = parseNonNegativeNumber(value, label);
  if (score > 1) throw new AgentAutomationDomainError(`${label} must be between 0 and 1`);
  return score;
}

function parseBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    throw new AgentAutomationDomainError(`${label} must be a boolean`);
  }
  return value;
}

function parseStatus<T extends string>(value: unknown, values: ReadonlySet<T>, label: string): T {
  if (typeof value !== "string" || !values.has(value as T)) {
    throw new AgentAutomationDomainError(`${label} is invalid`);
  }
  return value as T;
}

function parseParameters(value: unknown): Readonly<Record<string, unknown>> {
  if (value === undefined || value === null) return {};
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new AgentAutomationDomainError("schedule.parameters must be an object");
  }
  return value as Readonly<Record<string, unknown>>;
}

export function createSourcingCandidate(input: SourcingCandidate): SourcingCandidate {
  return {
    id: parseString(input.id, "candidate.id"),
    supplierName: parseString(input.supplierName, "candidate.supplierName"),
    productName: parseString(input.productName, "candidate.productName"),
    sku: parseOptionalString(input.sku, "candidate.sku"),
    unitCostCents: parseNonNegativeNumber(input.unitCostCents, "candidate.unitCostCents"),
    currency: parseString(input.currency, "candidate.currency"),
    minOrderQuantity: parseNonNegativeNumber(input.minOrderQuantity, "candidate.minOrderQuantity"),
    leadTimeDays: parseNonNegativeNumber(input.leadTimeDays, "candidate.leadTimeDays"),
    reliabilityScore: parseUnitScore(input.reliabilityScore, "candidate.reliabilityScore"),
    marginPercent: parsePercent(input.marginPercent, "candidate.marginPercent"),
    supplierUrl: parseOptionalString(input.supplierUrl, "candidate.supplierUrl"),
    notes: parseOptionalString(input.notes, "candidate.notes"),
  };
}

export function createSourcingRecommendation(
  input: SourcingRecommendation,
): SourcingRecommendation {
  return {
    id: parseString(input.id, "recommendation.id"),
    productId: parseString(input.productId, "recommendation.productId"),
    productTitle: parseString(input.productTitle, "recommendation.productTitle"),
    status: parseStatus(input.status, sourcingStatuses, "recommendation.status"),
    candidates: input.candidates.map(createSourcingCandidate),
    recommendedCandidateId: parseOptionalString(
      input.recommendedCandidateId,
      "recommendation.recommendedCandidateId",
    ),
    rationale: parseString(input.rationale, "recommendation.rationale"),
    confidence: parseUnitScore(input.confidence, "recommendation.confidence"),
    workflowId: parseOptionalString(input.workflowId, "recommendation.workflowId"),
    createdAt: parseString(input.createdAt, "recommendation.createdAt"),
    updatedAt: parseString(input.updatedAt, "recommendation.updatedAt"),
  };
}

export function createPricingStrategy(input: PricingStrategy): PricingStrategy {
  return {
    id: parseString(input.id, "pricingStrategy.id"),
    name: parseString(input.name, "pricingStrategy.name"),
    strategy: parseStatus(input.strategy, pricingStrategyTypes, "pricingStrategy.strategy"),
    enabled: parseBoolean(input.enabled, "pricingStrategy.enabled"),
    targetMarginPercent: parsePercent(
      input.targetMarginPercent,
      "pricingStrategy.targetMarginPercent",
    ),
    minMarginPercent: parsePercent(input.minMarginPercent, "pricingStrategy.minMarginPercent"),
    maxPriceCents: parseOptionalNonNegativeNumber(
      input.maxPriceCents,
      "pricingStrategy.maxPriceCents",
    ),
    minPriceCents: parseOptionalNonNegativeNumber(
      input.minPriceCents,
      "pricingStrategy.minPriceCents",
    ),
    competitorsTracked: parseOptionalNonNegativeNumber(
      input.competitorsTracked,
      "pricingStrategy.competitorsTracked",
    ),
    updatedAt: parseString(input.updatedAt, "pricingStrategy.updatedAt"),
  };
}

export function createPricingRecommendation(input: PricingRecommendation): PricingRecommendation {
  return {
    id: parseString(input.id, "pricingRecommendation.id"),
    productId: parseString(input.productId, "pricingRecommendation.productId"),
    productTitle: parseString(input.productTitle, "pricingRecommendation.productTitle"),
    currentPriceCents: parseNonNegativeNumber(
      input.currentPriceCents,
      "pricingRecommendation.currentPriceCents",
    ),
    recommendedPriceCents: parseNonNegativeNumber(
      input.recommendedPriceCents,
      "pricingRecommendation.recommendedPriceCents",
    ),
    currency: parseString(input.currency, "pricingRecommendation.currency"),
    expectedMarginPercent: parsePercent(
      input.expectedMarginPercent,
      "pricingRecommendation.expectedMarginPercent",
    ),
    strategyId: parseString(input.strategyId, "pricingRecommendation.strategyId"),
    rationale: parseString(input.rationale, "pricingRecommendation.rationale"),
    status: parseStatus(
      input.status,
      pricingRecommendationStatuses,
      "pricingRecommendation.status",
    ),
    workflowId: parseOptionalString(input.workflowId, "pricingRecommendation.workflowId"),
    createdAt: parseString(input.createdAt, "pricingRecommendation.createdAt"),
  };
}

export function createAgentSchedule(input: AgentSchedule): AgentSchedule {
  return {
    id: parseString(input.id, "schedule.id"),
    agentId: parseString(input.agentId, "schedule.agentId"),
    agentName: parseString(input.agentName, "schedule.agentName"),
    enabled: parseBoolean(input.enabled, "schedule.enabled"),
    frequency: parseStatus(input.frequency, scheduleFrequencies, "schedule.frequency"),
    cronExpression: parseOptionalString(input.cronExpression, "schedule.cronExpression"),
    timezone: parseString(input.timezone, "schedule.timezone"),
    parameters: parseParameters(input.parameters),
    nextRunAt: parseOptionalString(input.nextRunAt, "schedule.nextRunAt"),
    workflowId: parseOptionalString(input.workflowId, "schedule.workflowId"),
    updatedAt: parseString(input.updatedAt, "schedule.updatedAt"),
  };
}

export function pricingStrategyLabel(strategy: PricingStrategyType): string {
  switch (strategy) {
    case "margin_based":
      return "Margin based";
    case "competition_based":
      return "Competition based";
    case "demand_based":
      return "Demand based";
  }
}

export function scheduleFrequencyLabel(frequency: AgentScheduleFrequency): string {
  switch (frequency) {
    case "hourly":
      return "Hourly";
    case "daily":
      return "Daily";
    case "weekly":
      return "Weekly";
    case "custom":
      return "Custom";
  }
}
