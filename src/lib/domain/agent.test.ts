import { describe, expect, it } from "vitest";
import {
  agentKindLabel,
  agentStatusTone,
  countRunningAgents,
  type AgentRun,
  type AgentSummary,
} from "./agent";

const agents: AgentSummary[] = [
  {
    id: "agent_sourcing",
    kind: "sourcing",
    name: "Sourcing Agent",
    description: "Finds supplier opportunities.",
    status: "running",
    inFlightRuns: 1,
    queuedRuns: 2,
    successRate: 0.82,
    updatedAt: "2026-05-07T04:31:00Z",
  },
  {
    id: "agent_pricing",
    kind: "pricing",
    name: "Pricing Agent",
    status: "idle",
    inFlightRuns: 0,
    queuedRuns: 0,
    successRate: 0.94,
    updatedAt: "2026-05-07T04:32:00Z",
  },
];

describe("agent domain helpers", () => {
  it("labels agent kinds for operator-facing cards", () => {
    expect(agentKindLabel("sourcing")).toBe("Sourcing");
    expect(agentKindLabel("content")).toBe("Content");
    expect(agentKindLabel("pricing")).toBe("Pricing");
    expect(agentKindLabel("compliance")).toBe("Compliance");
  });

  it("counts agents with active runs", () => {
    expect(countRunningAgents(agents)).toBe(1);
  });

  it("maps statuses to stable UI tones", () => {
    expect(agentStatusTone("idle")).toBe("gray");
    expect(agentStatusTone("queued")).toBe("amber");
    expect(agentStatusTone("running")).toBe("blue");
    expect(agentStatusTone("succeeded")).toBe("green");
    expect(agentStatusTone("failed")).toBe("red");
    expect(agentStatusTone("cancelled")).toBe("gray");
    expect(agentStatusTone("disabled")).toBe("gray");
  });

  it("supports expandable run detail payloads without transport fields", () => {
    const run: AgentRun = {
      id: "run_1",
      agentId: "agent_sourcing",
      status: "succeeded",
      trigger: "manual",
      startedAt: "2026-05-07T04:20:00Z",
      finishedAt: "2026-05-07T04:21:30Z",
      durationMs: 90000,
      summary: "Found three supplier candidates.",
      input: { category: "fitness" },
      output: { candidates: 3 },
      createdAt: "2026-05-07T04:20:00Z",
    };

    expect(run.trigger).toBe("manual");
    expect(run.output).toEqual({ candidates: 3 });
  });
});
