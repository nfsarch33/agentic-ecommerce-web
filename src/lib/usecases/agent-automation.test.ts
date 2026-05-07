import { describe, expect, it, vi } from "vitest";
import {
  approveSourcingRecommendation,
  listAgentSchedules,
  listPricingRecommendations,
  listPricingStrategies,
  listSourcingRecommendations,
  updateSchedule,
  updateStrategy,
} from "./agent-automation";
import type {
  AgentSchedule,
  PricingRecommendation,
  PricingStrategy,
  SourcingRecommendation,
} from "@/lib/domain/agent-automation";

const recommendation: SourcingRecommendation = {
  id: "rec_1",
  productId: "prod_1",
  productTitle: "Resistance Band Set",
  status: "pending",
  candidates: [],
  rationale: "Best margin.",
  confidence: 0.87,
  createdAt: "2026-05-08T01:00:00Z",
  updatedAt: "2026-05-08T01:05:00Z",
};

const strategy: PricingStrategy = {
  id: "pricing_margin_default",
  name: "Margin guardrail",
  strategy: "margin_based",
  enabled: true,
  targetMarginPercent: 48,
  minMarginPercent: 35,
  updatedAt: "2026-05-08T01:10:00Z",
};

const pricingRecommendation: PricingRecommendation = {
  id: "price_rec_1",
  productId: "prod_1",
  productTitle: "Resistance Band Set",
  currentPriceCents: 2495,
  recommendedPriceCents: 2795,
  currency: "AUD",
  expectedMarginPercent: 52,
  strategyId: strategy.id,
  rationale: "Competitor median moved higher.",
  status: "pending",
  createdAt: "2026-05-08T01:11:00Z",
};

const schedule: AgentSchedule = {
  id: "schedule_sourcing_daily",
  agentId: "agent_sourcing",
  agentName: "Sourcing Agent",
  enabled: true,
  frequency: "daily",
  timezone: "Australia/Melbourne",
  parameters: { category: "fitness" },
  updatedAt: "2026-05-08T01:15:00Z",
};

describe("agent automation usecases", () => {
  it("lists sourcing recommendations through the configured adapter", async () => {
    const fetchSourcingRecommendationsImpl = vi.fn().mockResolvedValue([recommendation]);

    const result = await listSourcingRecommendations(
      { baseUrl: "http://api.test" },
      { fetchSourcingRecommendationsImpl },
    );

    expect(result).toEqual([recommendation]);
    expect(fetchSourcingRecommendationsImpl).toHaveBeenCalledWith({ baseUrl: "http://api.test" });
  });

  it("approves sourcing recommendations through the decision adapter", async () => {
    const decideSourcingRecommendationImpl = vi.fn().mockResolvedValue({
      ...recommendation,
      status: "approved",
    });

    const result = await approveSourcingRecommendation(
      { baseUrl: "http://api.test", recommendationId: "rec_1", candidateId: "candidate_1" },
      { decideSourcingRecommendationImpl },
    );

    expect(result.status).toBe("approved");
    expect(decideSourcingRecommendationImpl).toHaveBeenCalledWith({
      baseUrl: "http://api.test",
      recommendationId: "rec_1",
      decision: "approve",
      candidateId: "candidate_1",
    });
  });

  it("lists and updates pricing strategies", async () => {
    const fetchPricingStrategiesImpl = vi.fn().mockResolvedValue([strategy]);
    const updatePricingStrategyImpl = vi.fn().mockResolvedValue({ ...strategy, enabled: false });

    await expect(
      listPricingStrategies({ baseUrl: "http://api.test" }, { fetchPricingStrategiesImpl }),
    ).resolves.toEqual([strategy]);
    await expect(
      updateStrategy(
        { baseUrl: "http://api.test", strategyId: strategy.id, enabled: false },
        { updatePricingStrategyImpl },
      ),
    ).resolves.toMatchObject({ enabled: false });
  });

  it("lists pricing recommendations", async () => {
    const fetchPricingRecommendationsImpl = vi.fn().mockResolvedValue([pricingRecommendation]);

    const result = await listPricingRecommendations(
      { baseUrl: "http://api.test" },
      { fetchPricingRecommendationsImpl },
    );

    expect(result).toEqual([pricingRecommendation]);
  });

  it("lists and updates agent schedules", async () => {
    const fetchAgentSchedulesImpl = vi.fn().mockResolvedValue([schedule]);
    const updateAgentScheduleImpl = vi.fn().mockResolvedValue({ ...schedule, enabled: false });

    await expect(
      listAgentSchedules({ baseUrl: "http://api.test" }, { fetchAgentSchedulesImpl }),
    ).resolves.toEqual([schedule]);
    await updateSchedule(
      { baseUrl: "http://api.test", scheduleId: schedule.id, enabled: false },
      { updateAgentScheduleImpl },
    );

    expect(updateAgentScheduleImpl).toHaveBeenCalledWith({
      baseUrl: "http://api.test",
      scheduleId: schedule.id,
      enabled: false,
    });
  });
});
