import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentDashboard } from "./AgentDashboard";
import type { AgentRun, AgentSummary } from "@/lib/domain/agent";

const agents: AgentSummary[] = [
  {
    id: "agent_sourcing",
    kind: "sourcing",
    name: "Sourcing Agent",
    description: "Finds supplier opportunities.",
    status: "running",
    lastRunAt: "2026-05-07T04:20:00Z",
    nextRunAt: "2026-05-07T05:00:00Z",
    lastRunStatus: "succeeded",
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

describe("AgentDashboard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders status cards for each agent", () => {
    render(
      <AgentDashboard
        apiBaseUrl="http://api.test"
        initialAgents={agents}
        fetchHistoryImpl={vi.fn()}
        triggerRunImpl={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: /agent dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sourcing Agent" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pricing Agent" })).toBeInTheDocument();
    expect(screen.getByText("running")).toBeInTheDocument();
    expect(screen.getByText("82% success")).toBeInTheDocument();
    expect(screen.getByText("2 queued")).toBeInTheDocument();
  });

  it("loads expandable run history details for an agent", async () => {
    const user = userEvent.setup();
    const fetchHistoryImpl = vi.fn().mockResolvedValue([run]);

    render(
      <AgentDashboard
        apiBaseUrl="http://api.test"
        initialAgents={agents}
        fetchHistoryImpl={fetchHistoryImpl}
        triggerRunImpl={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /show history for sourcing agent/i }));

    expect(fetchHistoryImpl).toHaveBeenCalledWith({
      baseUrl: "http://api.test",
      agentId: "agent_sourcing",
    });
    expect(await screen.findByText("Found three supplier candidates.")).toBeInTheDocument();
    expect(screen.getByText(/"candidates": 3/)).toBeInTheDocument();
  });

  it("asks for confirmation before manually triggering a run", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const triggerRunImpl = vi.fn().mockResolvedValue({ ...run, id: "run_2", status: "queued" });

    render(
      <AgentDashboard
        apiBaseUrl="http://api.test"
        initialAgents={agents}
        fetchHistoryImpl={vi.fn().mockResolvedValue([])}
        triggerRunImpl={triggerRunImpl}
      />,
    );

    await user.click(screen.getByRole("button", { name: /run sourcing agent now/i }));

    expect(confirmSpy).toHaveBeenCalledWith("Trigger Sourcing Agent now?");
    expect(triggerRunImpl).toHaveBeenCalledWith({
      baseUrl: "http://api.test",
      agentId: "agent_sourcing",
    });
    expect(await screen.findByRole("status")).toHaveTextContent("Queued manual run run_2 for Sourcing Agent.");
  });

  it("does not trigger a run when confirmation is cancelled", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const triggerRunImpl = vi.fn();

    render(
      <AgentDashboard
        apiBaseUrl="http://api.test"
        initialAgents={agents}
        fetchHistoryImpl={vi.fn()}
        triggerRunImpl={triggerRunImpl}
      />,
    );

    await user.click(screen.getByRole("button", { name: /run pricing agent now/i }));

    await waitFor(() => expect(triggerRunImpl).not.toHaveBeenCalled());
  });
});
