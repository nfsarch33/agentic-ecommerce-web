export type AgentKind = "sourcing" | "content" | "pricing" | "compliance";
export type AgentStatus = "idle" | "queued" | "running" | "succeeded" | "failed" | "cancelled" | "disabled";
export type AgentRunTrigger = "manual" | "scheduled" | "event";
export type AgentStatusTone = "gray" | "blue" | "green" | "red" | "amber";

export interface AgentSummary {
  readonly id: string;
  readonly kind: AgentKind;
  readonly name: string;
  readonly description?: string;
  readonly status: AgentStatus;
  readonly lastRunAt?: string;
  readonly nextRunAt?: string;
  readonly lastRunStatus?: AgentStatus;
  readonly inFlightRuns: number;
  readonly queuedRuns: number;
  readonly successRate: number;
  readonly updatedAt: string;
}

export interface AgentRun {
  readonly id: string;
  readonly agentId: string;
  readonly status: AgentStatus;
  readonly trigger: AgentRunTrigger;
  readonly startedAt?: string;
  readonly finishedAt?: string;
  readonly durationMs?: number;
  readonly summary?: string;
  readonly error?: string;
  readonly input?: unknown;
  readonly output?: unknown;
  readonly createdAt: string;
}

const agentKindLabels: Record<AgentKind, string> = {
  sourcing: "Sourcing",
  content: "Content",
  pricing: "Pricing",
  compliance: "Compliance",
};

export function agentKindLabel(kind: AgentKind): string {
  return agentKindLabels[kind];
}

export function countRunningAgents(agents: readonly AgentSummary[]): number {
  return agents.filter((agent) => agent.status === "running").length;
}

export function agentStatusTone(status: AgentStatus): AgentStatusTone {
  switch (status) {
    case "running":
      return "blue";
    case "succeeded":
      return "green";
    case "failed":
      return "red";
    case "queued":
      return "amber";
    case "cancelled":
    case "disabled":
    case "idle":
      return "gray";
  }
}
