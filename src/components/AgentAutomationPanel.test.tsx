import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AgentAutomationPanel } from "./AgentAutomationPanel";
import type {
  AgentSchedule,
  PricingRecommendation,
  PricingStrategy,
  SourcingRecommendation,
} from "@/lib/domain/agent-automation";

const recommendations: SourcingRecommendation[] = [
  {
    id: "rec_1",
    productId: "prod_1",
    productTitle: "Resistance Band Set",
    status: "pending",
    candidates: [
      {
        id: "candidate_1",
        supplierName: "Sydney Fitness Supply",
        productName: "Resistance Band Set",
        unitCostCents: 1120,
        currency: "AUD",
        minOrderQuantity: 25,
        leadTimeDays: 6,
        reliabilityScore: 0.92,
        marginPercent: 55,
      },
    ],
    recommendedCandidateId: "candidate_1",
    rationale: "Best margin with local delivery.",
    confidence: 0.87,
    workflowId: "wf_sourcing_1",
    createdAt: "2026-05-08T01:00:00Z",
    updatedAt: "2026-05-08T01:05:00Z",
  },
];

const strategies: PricingStrategy[] = [
  {
    id: "pricing_margin_default",
    name: "Margin guardrail",
    strategy: "margin_based",
    enabled: true,
    targetMarginPercent: 48,
    minMarginPercent: 35,
    updatedAt: "2026-05-08T01:10:00Z",
  },
];

const pricingRecommendations: PricingRecommendation[] = [
  {
    id: "price_rec_1",
    productId: "prod_1",
    productTitle: "Resistance Band Set",
    currentPriceCents: 2495,
    recommendedPriceCents: 2795,
    currency: "AUD",
    expectedMarginPercent: 52,
    strategyId: "pricing_margin_default",
    rationale: "Competitor median moved higher.",
    status: "pending",
    workflowId: "wf_pricing_1",
    createdAt: "2026-05-08T01:11:00Z",
  },
];

const schedules: AgentSchedule[] = [
  {
    id: "schedule_sourcing_daily",
    agentId: "agent_sourcing",
    agentName: "Sourcing Agent",
    enabled: true,
    frequency: "daily",
    cronExpression: "0 8 * * *",
    timezone: "Australia/Melbourne",
    parameters: { category: "fitness", maxCandidates: 5 },
    nextRunAt: "2026-05-09T08:00:00+10:00",
    workflowId: "wf_schedule_1",
    updatedAt: "2026-05-08T01:15:00Z",
  },
];

describe("AgentAutomationPanel", () => {
  it("renders sourcing, pricing, and schedule controls with workflow links", () => {
    render(
      <AgentAutomationPanel
        apiBaseUrl="http://api.test"
        initialSourcingRecommendations={recommendations}
        initialPricingStrategies={strategies}
        initialPricingRecommendations={pricingRecommendations}
        initialSchedules={schedules}
      />,
    );

    expect(screen.getByRole("heading", { name: /sourcing recommendations/i })).toBeInTheDocument();
    expect(screen.getByText("Sydney Fitness Supply")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /pricing rules/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/target margin for margin guardrail/i)).toHaveValue(48);
    expect(screen.getByRole("heading", { name: /agent schedules/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/enable sourcing agent schedule/i)).toBeChecked();
    expect(screen.getAllByRole("link", { name: /view workflow/i })).toHaveLength(3);
  });

  it("approves, rejects, and adjusts sourcing recommendations", async () => {
    const user = userEvent.setup();
    const decideRecommendationImpl = vi
      .fn()
      .mockResolvedValueOnce({ ...recommendations[0], status: "approved" })
      .mockResolvedValueOnce({ ...recommendations[0], status: "rejected" })
      .mockResolvedValueOnce({ ...recommendations[0], status: "adjusted" });

    render(
      <AgentAutomationPanel
        apiBaseUrl="http://api.test"
        initialSourcingRecommendations={recommendations}
        initialPricingStrategies={strategies}
        initialPricingRecommendations={pricingRecommendations}
        initialSchedules={schedules}
        decideRecommendationImpl={decideRecommendationImpl}
      />,
    );

    await user.click(screen.getByRole("button", { name: /approve sourcing recommendation/i }));
    await user.click(screen.getByRole("button", { name: /reject sourcing recommendation/i }));
    await user.clear(screen.getByLabelText(/adjusted unit cost/i));
    await user.type(screen.getByLabelText(/adjusted unit cost/i), "10.50");
    await user.click(screen.getByRole("button", { name: /adjust sourcing recommendation/i }));

    expect(decideRecommendationImpl).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ decision: "approve", candidateId: "candidate_1" }),
    );
    expect(decideRecommendationImpl).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ decision: "reject" }),
    );
    expect(decideRecommendationImpl).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ decision: "adjust", adjustedUnitCostCents: 1050 }),
    );
  });

  it("saves pricing rules and toggles schedules", async () => {
    const user = userEvent.setup();
    const updateStrategyImpl = vi
      .fn()
      .mockResolvedValue({ ...strategies[0], targetMarginPercent: 45 });
    const updateScheduleImpl = vi.fn().mockResolvedValue({ ...schedules[0], enabled: false });

    render(
      <AgentAutomationPanel
        apiBaseUrl="http://api.test"
        initialSourcingRecommendations={recommendations}
        initialPricingStrategies={strategies}
        initialPricingRecommendations={pricingRecommendations}
        initialSchedules={schedules}
        updateStrategyImpl={updateStrategyImpl}
        updateScheduleImpl={updateScheduleImpl}
      />,
    );

    await user.clear(screen.getByLabelText(/target margin for margin guardrail/i));
    await user.type(screen.getByLabelText(/target margin for margin guardrail/i), "45");
    await user.click(screen.getByRole("button", { name: /save margin guardrail pricing rule/i }));
    await user.click(screen.getByLabelText(/enable sourcing agent schedule/i));

    expect(updateStrategyImpl).toHaveBeenCalledWith(
      expect.objectContaining({
        strategyId: "pricing_margin_default",
        targetMarginPercent: 45,
      }),
    );
    expect(updateScheduleImpl).toHaveBeenCalledWith(
      expect.objectContaining({ scheduleId: "schedule_sourcing_daily", enabled: false }),
    );
  });
});
