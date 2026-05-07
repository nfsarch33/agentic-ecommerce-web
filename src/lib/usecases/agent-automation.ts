import {
  decideSourcingRecommendation,
  fetchAgentSchedules,
  fetchPricingRecommendations,
  fetchPricingStrategies,
  fetchSourcingRecommendations,
  updateAgentSchedule,
  updatePricingStrategy,
  type DecideSourcingRecommendationOptions,
  type FetchAgentAutomationOptions,
  type UpdateAgentScheduleOptions,
  type UpdatePricingStrategyOptions,
} from "@/lib/adapters/api/agent-automation";
import type {
  AgentSchedule,
  PricingRecommendation,
  PricingStrategy,
  SourcingRecommendation,
} from "@/lib/domain/agent-automation";

export interface ListAgentAutomationInput {
  readonly baseUrl: string;
}

export interface ApproveSourcingRecommendationInput {
  readonly baseUrl: string;
  readonly recommendationId: string;
  readonly candidateId?: string;
}

export type DecideRecommendationInput = Omit<
  DecideSourcingRecommendationOptions,
  "fetchImpl" | "signal"
>;
export type UpdateStrategyInput = Omit<UpdatePricingStrategyOptions, "fetchImpl" | "signal">;
export type UpdateScheduleInput = Omit<UpdateAgentScheduleOptions, "fetchImpl" | "signal">;

export interface AgentAutomationUsecaseDeps {
  readonly fetchSourcingRecommendationsImpl?: (
    opts: FetchAgentAutomationOptions,
  ) => Promise<SourcingRecommendation[]>;
  readonly decideSourcingRecommendationImpl?: (
    opts: DecideSourcingRecommendationOptions,
  ) => Promise<SourcingRecommendation>;
  readonly fetchPricingStrategiesImpl?: (
    opts: FetchAgentAutomationOptions,
  ) => Promise<PricingStrategy[]>;
  readonly updatePricingStrategyImpl?: (
    opts: UpdatePricingStrategyOptions,
  ) => Promise<PricingStrategy>;
  readonly fetchPricingRecommendationsImpl?: (
    opts: FetchAgentAutomationOptions,
  ) => Promise<PricingRecommendation[]>;
  readonly fetchAgentSchedulesImpl?: (
    opts: FetchAgentAutomationOptions,
  ) => Promise<AgentSchedule[]>;
  readonly updateAgentScheduleImpl?: (opts: UpdateAgentScheduleOptions) => Promise<AgentSchedule>;
}

export async function listSourcingRecommendations(
  input: ListAgentAutomationInput,
  deps: AgentAutomationUsecaseDeps = {},
): Promise<SourcingRecommendation[]> {
  const fetchImpl = deps.fetchSourcingRecommendationsImpl ?? fetchSourcingRecommendations;
  return fetchImpl({ baseUrl: input.baseUrl });
}

export async function approveSourcingRecommendation(
  input: ApproveSourcingRecommendationInput,
  deps: AgentAutomationUsecaseDeps = {},
): Promise<SourcingRecommendation> {
  const decideImpl = deps.decideSourcingRecommendationImpl ?? decideSourcingRecommendation;
  return decideImpl({
    baseUrl: input.baseUrl,
    recommendationId: input.recommendationId,
    decision: "approve",
    candidateId: input.candidateId,
  });
}

export async function decideRecommendation(
  input: DecideRecommendationInput,
  deps: AgentAutomationUsecaseDeps = {},
): Promise<SourcingRecommendation> {
  const decideImpl = deps.decideSourcingRecommendationImpl ?? decideSourcingRecommendation;
  return decideImpl(input);
}

export async function listPricingStrategies(
  input: ListAgentAutomationInput,
  deps: AgentAutomationUsecaseDeps = {},
): Promise<PricingStrategy[]> {
  const fetchImpl = deps.fetchPricingStrategiesImpl ?? fetchPricingStrategies;
  return fetchImpl({ baseUrl: input.baseUrl });
}

export async function updateStrategy(
  input: UpdateStrategyInput,
  deps: AgentAutomationUsecaseDeps = {},
): Promise<PricingStrategy> {
  const updateImpl = deps.updatePricingStrategyImpl ?? updatePricingStrategy;
  return updateImpl(input);
}

export async function listPricingRecommendations(
  input: ListAgentAutomationInput,
  deps: AgentAutomationUsecaseDeps = {},
): Promise<PricingRecommendation[]> {
  const fetchImpl = deps.fetchPricingRecommendationsImpl ?? fetchPricingRecommendations;
  return fetchImpl({ baseUrl: input.baseUrl });
}

export async function listAgentSchedules(
  input: ListAgentAutomationInput,
  deps: AgentAutomationUsecaseDeps = {},
): Promise<AgentSchedule[]> {
  const fetchImpl = deps.fetchAgentSchedulesImpl ?? fetchAgentSchedules;
  return fetchImpl({ baseUrl: input.baseUrl });
}

export async function updateSchedule(
  input: UpdateScheduleInput,
  deps: AgentAutomationUsecaseDeps = {},
): Promise<AgentSchedule> {
  const updateImpl = deps.updateAgentScheduleImpl ?? updateAgentSchedule;
  return updateImpl(input);
}
