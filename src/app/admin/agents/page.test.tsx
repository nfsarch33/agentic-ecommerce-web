import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AgentsPage from "./page";

vi.mock("@/lib/usecases/agents", () => ({
  listAgents: vi.fn(),
  fetchAgentRunHistory: vi.fn(),
  triggerManualAgentRun: vi.fn(),
}));

vi.mock("@/components/AgentDashboard", () => ({
  AgentDashboard: ({ initialAgents }: { initialAgents: Array<{ name: string }> }) => (
    <div>
      <h1>Agent Dashboard</h1>
      <p>Agents: {initialAgents.length}</p>
      {initialAgents.map((agent) => (
        <p key={agent.name}>{agent.name}</p>
      ))}
    </div>
  ),
}));

import { listAgents } from "@/lib/usecases/agents";

const mockListAgents = vi.mocked(listAgents);

describe("Admin agents page", () => {
  it("loads the initial agent list from the backend", async () => {
    mockListAgents.mockResolvedValue([
      {
        id: "agent_sourcing",
        kind: "sourcing",
        name: "Sourcing Agent",
        status: "idle",
        inFlightRuns: 0,
        queuedRuns: 0,
        successRate: 0.9,
        updatedAt: "2026-05-07T04:31:00Z",
      },
    ]);

    render(await AgentsPage());

    expect(screen.getByRole("heading", { name: /agent dashboard/i })).toBeInTheDocument();
    expect(screen.getByText("Agents: 1")).toBeInTheDocument();
    expect(screen.getByText("Sourcing Agent")).toBeInTheDocument();
    expect(mockListAgents).toHaveBeenCalledWith(expect.objectContaining({ baseUrl: "http://localhost:8080" }));
  });
});
