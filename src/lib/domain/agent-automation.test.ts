import { describe, expect, it } from "vitest";
import {
  AgentAutomationDomainError,
  createAgentSchedule,
  createPricingStrategy,
  createSourcingRecommendation,
  pricingStrategyLabel,
  scheduleFrequencyLabel,
} from "./agent-automation";

const candidate = {
  id: "candidate_1",
  supplierName: "Sydney Fitness Supply",
  productName: "Resistance Band Set",
  unitCostCents: 1120,
  currency: "AUD",
  minOrderQuantity: 25,
  leadTimeDays: 6,
  reliabilityScore: 0.92,
  marginPercent: 55,
  supplierUrl: "https://supplier.example/bands",
  notes: "Local fulfilment and strong reviews.",
} as const;

describe("agent automation domain", () => {
  it("normalizes sourcing recommendations with Temporal workflow references", () => {
    const recommendation = createSourcingRecommendation({
      id: "rec_1",
      productId: "prod_1",
      productTitle: "Resistance Band Set",
      status: "pending",
      candidates: [candidate],
      recommendedCandidateId: "candidate_1",
      rationale: "Best margin with local delivery.",
      confidence: 0.87,
      workflowId: "wf_sourcing_1",
      createdAt: "2026-05-08T01:00:00Z",
      updatedAt: "2026-05-08T01:05:00Z",
    });

    expect(recommendation.candidates[0]).toEqual(candidate);
    expect(recommendation.workflowId).toBe("wf_sourcing_1");
  });

  it("normalizes pricing strategies and labels strategy types", () => {
    const strategy = createPricingStrategy({
      id: "pricing_margin_default",
      name: "Margin guardrail",
      strategy: "margin_based",
      enabled: true,
      targetMarginPercent: 48,
      minMarginPercent: 35,
      maxPriceCents: 3995,
      minPriceCents: 1995,
      updatedAt: "2026-05-08T01:10:00Z",
    });

    expect(strategy.enabled).toBe(true);
    expect(pricingStrategyLabel(strategy.strategy)).toBe("Margin based");
  });

  it("normalizes agent schedules with configurable frequency parameters", () => {
    const schedule = createAgentSchedule({
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
    });

    expect(schedule.parameters).toEqual({ category: "fitness", maxCandidates: 5 });
    expect(scheduleFrequencyLabel(schedule.frequency)).toBe("Daily");
  });

  it("rejects invalid percentages and schedule frequencies", () => {
    expect(() =>
      createSourcingRecommendation({
        id: "rec_bad",
        productId: "prod_1",
        productTitle: "Bad",
        status: "pending",
        candidates: [{ ...candidate, reliabilityScore: 1.4 }],
        rationale: "Invalid",
        confidence: 0.5,
        createdAt: "2026-05-08T01:00:00Z",
        updatedAt: "2026-05-08T01:00:00Z",
      }),
    ).toThrow(AgentAutomationDomainError);

    expect(() =>
      createAgentSchedule({
        id: "schedule_bad",
        agentId: "agent_sourcing",
        agentName: "Sourcing Agent",
        enabled: true,
        frequency: "fortnightly" as never,
        timezone: "Australia/Melbourne",
        parameters: {},
        updatedAt: "2026-05-08T01:15:00Z",
      }),
    ).toThrow("schedule.frequency is invalid");
  });
});
