import { describe, expect, it, vi } from "vitest";
import {
  fetchAgentRunHistory,
  listAgents,
  triggerManualAgentRun,
} from "./agents";
import type { AgentRun, AgentSummary } from "@/lib/domain/agent";

const agent: AgentSummary = {
  id: "agent_sourcing",
  kind: "sourcing",
  name: "Sourcing Agent",
  status: "idle",
  inFlightRuns: 0,
  queuedRuns: 0,
  successRate: 0.9,
  updatedAt: "2026-05-07T04:31:00Z",
};

const run: AgentRun = {
  id: "run_1",
  agentId: "agent_sourcing",
  status: "queued",
  trigger: "manual",
  createdAt: "2026-05-07T04:32:00Z",
};

describe("agent usecases", () => {
  it("lists agents through the configured adapter", async () => {
    const fetchAgentsImpl = vi.fn().mockResolvedValue([agent]);

    const result = await listAgents(
      { baseUrl: "http://api.test" },
      { fetchAgentsImpl },
    );

    expect(result).toEqual([agent]);
    expect(fetchAgentsImpl).toHaveBeenCalledWith({ baseUrl: "http://api.test" });
  });

  it("triggers a manual run for an agent", async () => {
    const triggerAgentRunImpl = vi.fn().mockResolvedValue(run);

    const result = await triggerManualAgentRun(
      { baseUrl: "http://api.test", agentId: "agent_sourcing" },
      { triggerAgentRunImpl },
    );

    expect(result).toBe(run);
    expect(triggerAgentRunImpl).toHaveBeenCalledWith({
      baseUrl: "http://api.test",
      agentId: "agent_sourcing",
    });
  });

  it("fetches run history through the configured adapter", async () => {
    const fetchAgentHistoryImpl = vi.fn().mockResolvedValue([run]);

    const result = await fetchAgentRunHistory(
      { baseUrl: "http://api.test", agentId: "agent_sourcing" },
      { fetchAgentHistoryImpl },
    );

    expect(result).toEqual([run]);
    expect(fetchAgentHistoryImpl).toHaveBeenCalledWith({
      baseUrl: "http://api.test",
      agentId: "agent_sourcing",
    });
  });
});
