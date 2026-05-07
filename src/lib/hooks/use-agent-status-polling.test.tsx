import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAgentStatusPolling } from "./use-agent-status-polling";
import type { AgentSummary } from "@/lib/domain/agent";

const initialAgents: AgentSummary[] = [
  {
    id: "agent_sourcing",
    kind: "sourcing",
    name: "Sourcing Agent",
    status: "idle",
    inFlightRuns: 0,
    queuedRuns: 0,
    successRate: 0.9,
    updatedAt: "2026-05-07T04:30:00Z",
  },
];

const nextAgents: AgentSummary[] = [
  {
    ...initialAgents[0]!,
    status: "running",
    inFlightRuns: 1,
    updatedAt: "2026-05-07T04:31:00Z",
  },
];

describe("useAgentStatusPolling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with the provided agents and polls for status updates", async () => {
    const listAgentsImpl = vi.fn().mockResolvedValue(nextAgents);

    const { result } = renderHook(() =>
      useAgentStatusPolling({
        apiBaseUrl: "http://api.test",
        initialAgents,
        intervalMs: 1000,
        listAgentsImpl,
      }),
    );

    expect(result.current.agents[0]?.status).toBe("idle");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(listAgentsImpl).toHaveBeenCalledWith({ baseUrl: "http://api.test" });
    expect(result.current.agents[0]?.status).toBe("running");
    expect(result.current.error).toBeNull();
  });

  it("keeps the last known agent list when polling fails", async () => {
    const listAgentsImpl = vi.fn().mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() =>
      useAgentStatusPolling({
        apiBaseUrl: "http://api.test",
        initialAgents,
        intervalMs: 1000,
        listAgentsImpl,
      }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(result.current.agents[0]?.status).toBe("idle");
    expect(result.current.error).toBe("network down");
  });
});
