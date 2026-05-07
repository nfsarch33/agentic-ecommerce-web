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

function textResponse(body: string, init: ResponseInit = { status: 200 }): Response {
  return new Response(body, {
    headers: { "content-type": "application/json" },
    ...init,
  });
}

const rawAgent = {
  id: "sourcing",
  name: "Sourcing Agent",
  description: "Finds supplier opportunities.",
  capabilities: ["candidate_scoring", "opportunity_ranking"],
};

const rawRun = {
  id: "018f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c",
  task_id: "118f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c",
  agent_id: "sourcing",
  state: "succeeded",
  priority: 5,
  input: { candidates: [{ sku: "RB-SET" }] },
  result: { top_candidate: { sku: "RB-SET" }, scores: [{ sku: "RB-SET" }] },
  started_at: "2026-05-07T04:20:00Z",
  finished_at: "2026-05-07T04:21:30Z",
  created_at: "2026-05-07T04:20:00Z",
};

describe("fetchAgents", () => {
  it("fetches and parses the v0.6 agent summary contract", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ agents: [rawAgent] }));

    const agents = await fetchAgents({ baseUrl: "http://api.test", fetchImpl: mockFetch });

    expect(agents).toHaveLength(1);
    expect(agents[0]?.id).toBe("sourcing");
    expect(agents[0]?.kind).toBe("sourcing");
    expect(agents[0]?.status).toBe("idle");
    expect(agents[0]?.queuedRuns).toBe(0);
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
        fetchImpl: vi.fn().mockResolvedValue(jsonResponse({ agents: [{ ...rawAgent, id: "unknown" }] })),
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
      agentId: "sourcing",
      fetchImpl: mockFetch,
    });

    expect(run.id).toBe(rawRun.id);
    expect(run.status).toBe("succeeded");
    expect(run.trigger).toBe("manual");
    expect(run.durationMs).toBe(90000);
    expect(run.output).toEqual(rawRun.result);
    const [, init] = mockFetch.mock.calls[0]!;
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.payload.candidates[0].sku).toBe("RB-SET");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/agents/sourcing/run",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "content-type": "application/json" }),
        body: expect.stringContaining('"priority":0'),
      }),
    );
  });

  it("posts explicit priority and payload when provided", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse(rawRun, { status: 202 }));

    await triggerAgentRun({
      baseUrl: "http://api.test",
      agentId: "pricing",
      priority: 9,
      payload: { sku: "CUSTOM" },
      fetchImpl: mockFetch,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/agents/pricing/run",
      expect.objectContaining({
        body: JSON.stringify({ priority: 9, payload: { sku: "CUSTOM" } }),
      }),
    );
  });

  it("also accepts a bare run response from early backend implementations", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse(rawRun));

    const run = await triggerAgentRun({
      baseUrl: "http://api.test",
      agentId: "sourcing",
      fetchImpl: mockFetch,
    });

    expect(run.id).toBe(rawRun.id);
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

  it("wraps malformed run JSON responses", async () => {
    await expect(
      triggerAgentRun({
        baseUrl: "http://api.test",
        agentId: "compliance",
        fetchImpl: vi.fn().mockResolvedValue(textResponse("{not-json")),
      }),
    ).rejects.toBeInstanceOf(AgentsApiError);
  });
});

describe("fetchAgentHistory", () => {
  it("fetches run history for a specific agent", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ runs: [rawRun] }));

    const runs = await fetchAgentHistory({
      baseUrl: "http://api.test",
      agentId: "sourcing",
      fetchImpl: mockFetch,
    });

    expect(runs).toHaveLength(1);
    expect(runs[0]?.agentId).toBe("sourcing");
    expect(runs[0]?.summary).toBe("Completed with result: scores, top_candidate.");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/agents/sourcing/history",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("wraps malformed history responses", async () => {
    await expect(
      fetchAgentHistory({
        baseUrl: "http://api.test",
        agentId: "sourcing",
        fetchImpl: vi.fn().mockResolvedValue(jsonResponse({ history: [rawRun] })),
      }),
    ).rejects.toBeInstanceOf(AgentsApiError);
  });

  it("maps queued, running, failed, and cancelled backend states", async () => {
    const runs = await fetchAgentHistory({
      baseUrl: "http://api.test",
      agentId: "sourcing",
      fetchImpl: vi.fn().mockResolvedValue(
        jsonResponse({
          runs: [
            { ...rawRun, id: "queued", state: "queued", started_at: undefined, finished_at: undefined, result: undefined },
            { ...rawRun, id: "running", state: "running", finished_at: undefined, result: undefined },
            {
              ...rawRun,
              id: "failed",
              state: "failed",
              result: undefined,
              error: { code: "agent_failed", detail: "deterministic failure" },
            },
            { ...rawRun, id: "cancelled", state: "cancelled", result: undefined },
          ],
        }),
      ),
    });

    expect(runs.map((run) => run.status)).toEqual(["queued", "running", "failed", "cancelled"]);
    expect(runs[0]?.summary).toBe("Run queued.");
    expect(runs[1]?.summary).toBe("Run in progress.");
    expect(runs[2]?.error).toBe("agent_failed: deterministic failure");
    expect(runs[3]?.summary).toBe("Run cancelled.");
  });
});
