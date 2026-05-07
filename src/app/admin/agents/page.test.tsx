import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AgentsPage from "./page";

vi.mock("@/lib/usecases/agents", () => ({
  listAgents: vi.fn(),
  fetchAgentRunHistory: vi.fn(),
  triggerManualAgentRun: vi.fn(),
}));

vi.mock("@/lib/usecases/agent-automation", () => ({
  listAgentSchedules: vi.fn(),
  listPricingRecommendations: vi.fn(),
  listPricingStrategies: vi.fn(),
  listSourcingRecommendations: vi.fn(),
}));

vi.mock("@/components/AgentDashboard", () => ({
  AgentDashboard: ({
    initialAgents,
    initialSourcingRecommendations,
    initialPricingStrategies,
    initialPricingRecommendations,
    initialSchedules,
  }: {
    initialAgents: Array<{ name: string }>;
    initialSourcingRecommendations: unknown[];
    initialPricingStrategies: unknown[];
    initialPricingRecommendations: unknown[];
    initialSchedules: unknown[];
  }) => (
    <div>
      <h1>Agent Dashboard</h1>
      <p>Agents: {initialAgents.length}</p>
      <p>Sourcing recommendations: {initialSourcingRecommendations.length}</p>
      <p>Pricing rules: {initialPricingStrategies.length}</p>
      <p>Pricing recommendations: {initialPricingRecommendations.length}</p>
      <p>Schedules: {initialSchedules.length}</p>
      {initialAgents.map((agent) => (
        <p key={agent.name}>{agent.name}</p>
      ))}
    </div>
  ),
}));

import { listAgents } from "@/lib/usecases/agents";
import {
  listAgentSchedules,
  listPricingRecommendations,
  listPricingStrategies,
  listSourcingRecommendations,
} from "@/lib/usecases/agent-automation";

const mockListAgents = vi.mocked(listAgents);
const mockListSourcingRecommendations = vi.mocked(listSourcingRecommendations);
const mockListPricingStrategies = vi.mocked(listPricingStrategies);
const mockListPricingRecommendations = vi.mocked(listPricingRecommendations);
const mockListAgentSchedules = vi.mocked(listAgentSchedules);

describe("Admin agents page", () => {
  it("loads the initial agent dashboard data from the backend", async () => {
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
    mockListSourcingRecommendations.mockResolvedValue([
      {
        id: "rec_1",
        productId: "prod_1",
        productTitle: "Resistance Band Set",
        status: "pending",
        candidates: [],
        rationale: "Best margin.",
        confidence: 0.87,
        createdAt: "2026-05-08T01:00:00Z",
        updatedAt: "2026-05-08T01:05:00Z",
      },
    ]);
    mockListPricingStrategies.mockResolvedValue([
      {
        id: "pricing_margin_default",
        name: "Margin guardrail",
        strategy: "margin_based",
        enabled: true,
        targetMarginPercent: 48,
        minMarginPercent: 35,
        updatedAt: "2026-05-08T01:10:00Z",
      },
    ]);
    mockListPricingRecommendations.mockResolvedValue([]);
    mockListAgentSchedules.mockResolvedValue([
      {
        id: "schedule_sourcing_daily",
        agentId: "agent_sourcing",
        agentName: "Sourcing Agent",
        enabled: true,
        frequency: "daily",
        timezone: "Australia/Melbourne",
        parameters: {},
        updatedAt: "2026-05-08T01:15:00Z",
      },
    ]);

    render(await AgentsPage());

    expect(screen.getByRole("heading", { name: /agent dashboard/i })).toBeInTheDocument();
    expect(screen.getByText("Agents: 1")).toBeInTheDocument();
    expect(screen.getByText("Sourcing recommendations: 1")).toBeInTheDocument();
    expect(screen.getByText("Pricing rules: 1")).toBeInTheDocument();
    expect(screen.getByText("Pricing recommendations: 0")).toBeInTheDocument();
    expect(screen.getByText("Schedules: 1")).toBeInTheDocument();
    expect(screen.getByText("Sourcing Agent")).toBeInTheDocument();
    expect(mockListAgents).toHaveBeenCalledWith(
      expect.objectContaining({ baseUrl: "http://localhost:8080" }),
    );
    expect(mockListSourcingRecommendations).toHaveBeenCalledWith(
      expect.objectContaining({ baseUrl: "http://localhost:8080" }),
    );
    expect(mockListPricingStrategies).toHaveBeenCalledWith(
      expect.objectContaining({ baseUrl: "http://localhost:8080" }),
    );
    expect(mockListPricingRecommendations).toHaveBeenCalledWith(
      expect.objectContaining({ baseUrl: "http://localhost:8080" }),
    );
    expect(mockListAgentSchedules).toHaveBeenCalledWith(
      expect.objectContaining({ baseUrl: "http://localhost:8080" }),
    );
  });
});
