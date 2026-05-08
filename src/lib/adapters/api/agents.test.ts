import { describe, expect, it, vi } from "vitest";
import {
  AgentsApiError,
  fetchAgentHistory,
  fetchAgents,
  triggerAgentRun,
} from "./agents";

function jsonResponse(body: unknown, init: ResponseInit = { status: 200 }): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    ...init,
  });
}

const rawAgent = {
  id: "agent_sourcing",
  kind: "sourcing",
  name: "Sourcing Agent",
  description: "Finds supplier opportunities.",
  status: "running",
  last_run_at: "2026-05-07T04:20:00Z",
  next_run_at: "2026-05-07T05:00:00Z",
  last_run_status: "succeeded",
  in_flight_runs: 1,
  queued_runs: 2,
  success_rate: 0.82,
  updated_at: "2026-05-07T04:31:00Z",
};

const rawRun = {
  id: "run_1",
  agent_id: "agent_sourcing",
  status: "succeeded",
  trigger: "manual",
  started_at: "2026-05-07T04:20:00Z",
  finished_at: "2026-05-07T04:21:30Z",
  duration_ms: 90000,
  summary: "Found three supplier candidates.",
  error: null,
  input: { category: "fitness" },
  output: { candidates: 3 },
  created_at: "2026-05-07T04:20:00Z",
};

describe("fetchAgents v0.6 contract", () => {
  it("fetches and parses the v0.6 agent summary contract", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ agents: [rawAgent] }));

    const agents = await fetchAgents({ baseUrl: "http://api.test", fetchImpl: mockFetch });

    expect(agents).toHaveLength(1);
    expect(agents[0]?.id).toBe("agent_sourcing");
    expect(agents[0]?.kind).toBe("sourcing");
    expect(agents[0]?.lastRunStatus).toBe("succeeded");
    expect(agents[0]?.queuedRuns).toBe(2);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/agents",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("wraps HTTP and malformed responses", async () => {
    await expect(
      fetchAgents({
        baseUrl: "http://api.test",
        fetchImpl: vi.fn().mockResolvedValue(jsonResponse({ error: "boom" }, { status: 500 })),
      }),
    ).rejects.toBeInstanceOf(AgentsApiError);

    await expect(
      fetchAgents({
        baseUrl: "http://api.test",
        fetchImpl: vi.fn().mockResolvedValue(jsonResponse({ agents: [{ ...rawAgent, kind: "unknown" }] })),
      }),
    ).rejects.toBeInstanceOf(AgentsApiError);
  });

  it("wraps network failures", async () => {
    await expect(
      fetchAgents({
        baseUrl: "http://api.test",
        fetchImpl: vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
      }),
    ).rejects.toBeInstanceOf(AgentsApiError);
  });
});

describe("triggerAgentRun", () => {
  it("posts a manual run request and parses the created run", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ run: rawRun }, { status: 202 }));

    const run = await triggerAgentRun({
      baseUrl: "http://api.test",
      agentId: "agent_sourcing",
      fetchImpl: mockFetch,
    });

    expect(run.id).toBe("run_1");
    expect(run.trigger).toBe("manual");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/agents/agent_sourcing/run",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "content-type": "application/json" }),
        body: JSON.stringify({ trigger: "manual" }),
      }),
    );
  });

  it("also accepts a bare run response from early backend implementations", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse(rawRun));

    const run = await triggerAgentRun({
      baseUrl: "http://api.test",
      agentId: "agent_sourcing",
      fetchImpl: mockFetch,
    });

    expect(run.id).toBe("run_1");
  });

  it("rejects an empty agent id before posting", async () => {
    await expect(
      triggerAgentRun({
        baseUrl: "http://api.test",
        agentId: "",
        fetchImpl: vi.fn(),
      }),
    ).rejects.toBeInstanceOf(AgentsApiError);
  });
});

describe("fetchAgentHistory", () => {
  it("fetches run history for a specific agent", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ runs: [rawRun] }));

    const runs = await fetchAgentHistory({
      baseUrl: "http://api.test",
      agentId: "agent_sourcing",
      fetchImpl: mockFetch,
    });

    expect(runs).toHaveLength(1);
    expect(runs[0]?.agentId).toBe("agent_sourcing");
    expect(runs[0]?.summary).toBe("Found three supplier candidates.");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/agents/agent_sourcing/history",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("wraps malformed history responses", async () => {
    await expect(
      fetchAgentHistory({
        baseUrl: "http://api.test",
        agentId: "agent_sourcing",
        fetchImpl: vi.fn().mockResolvedValue(jsonResponse({ history: [rawRun] })),
      }),
    ).rejects.toBeInstanceOf(AgentsApiError);
  });

  it("requires a non-empty agentId", async () => {
    await expect(
      fetchAgentHistory({ baseUrl: "http://api.test", agentId: "" }),
    ).rejects.toBeInstanceOf(AgentsApiError);
  });

  it("wraps fetch network failures from fetchAgentHistory", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    await expect(
      fetchAgentHistory({
        baseUrl: "http://api.test",
        agentId: "agent_sourcing",
        fetchImpl: mockFetch,
      }),
    ).rejects.toThrow(/network error/);
  });
});

describe("triggerAgentRun edge cases", () => {
  it("requires a non-empty agentId", async () => {
    const { triggerAgentRun } = await import("./agents");
    await expect(
      triggerAgentRun({ baseUrl: "http://api.test", agentId: "" }),
    ).rejects.toBeInstanceOf(AgentsApiError);
  });

  it("wraps fetch network failures", async () => {
    const { triggerAgentRun } = await import("./agents");
    const mockFetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    await expect(
      triggerAgentRun({
        baseUrl: "http://api.test",
        agentId: "agent_sourcing",
        fetchImpl: mockFetch,
      }),
    ).rejects.toThrow(/network error/);
  });
});
