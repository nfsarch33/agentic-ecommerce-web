import {
  fetchAgentHistory,
  fetchAgents,
  triggerAgentRun,
  type FetchAgentHistoryOptions,
  type FetchAgentsOptions,
  type TriggerAgentRunOptions,
} from "@/lib/adapters/api/agents";
import type { AgentRun, AgentSummary } from "@/lib/domain/agent";

export interface ListAgentsInput {
  readonly baseUrl: string;
}

export interface TriggerManualAgentRunInput {
  readonly baseUrl: string;
  readonly agentId: string;
}

export interface FetchAgentRunHistoryInput {
  readonly baseUrl: string;
  readonly agentId: string;
}

export interface AgentUsecaseDeps {
  readonly fetchAgentsImpl?: (opts: FetchAgentsOptions) => Promise<AgentSummary[]>;
  readonly triggerAgentRunImpl?: (opts: TriggerAgentRunOptions) => Promise<AgentRun>;
  readonly fetchAgentHistoryImpl?: (opts: FetchAgentHistoryOptions) => Promise<AgentRun[]>;
}

export async function listAgents(
  input: ListAgentsInput,
  deps: AgentUsecaseDeps = {},
): Promise<AgentSummary[]> {
  const fetchAgentsImpl = deps.fetchAgentsImpl ?? fetchAgents;
  return fetchAgentsImpl({ baseUrl: input.baseUrl });
}

export async function triggerManualAgentRun(
  input: TriggerManualAgentRunInput,
  deps: AgentUsecaseDeps = {},
): Promise<AgentRun> {
  const triggerAgentRunImpl = deps.triggerAgentRunImpl ?? triggerAgentRun;
  return triggerAgentRunImpl({ baseUrl: input.baseUrl, agentId: input.agentId });
}

export async function fetchAgentRunHistory(
  input: FetchAgentRunHistoryInput,
  deps: AgentUsecaseDeps = {},
): Promise<AgentRun[]> {
  const fetchAgentHistoryImpl = deps.fetchAgentHistoryImpl ?? fetchAgentHistory;
  return fetchAgentHistoryImpl({ baseUrl: input.baseUrl, agentId: input.agentId });
}
