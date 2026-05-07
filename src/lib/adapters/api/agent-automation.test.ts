import { describe, expect, it, vi } from "vitest";
import {
  AgentAutomationApiError,
  decideSourcingRecommendation,
  fetchAgentSchedules,
  fetchPricingRecommendations,
  fetchPricingStrategies,
  fetchSourcingRecommendations,
  updateAgentSchedule,
  updatePricingStrategy,
} from "./agent-automation";

function jsonResponse(body: unknown, init: ResponseInit = { status: 200 }): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    ...init,
  });
}

const rawRecommendation = {
  id: "rec_1",
  product_id: "prod_1",
  product_title: "Resistance Band Set",
  status: "pending",
  candidates: [
    {
      id: "candidate_1",
      supplier_name: "Sydney Fitness Supply",
      product_name: "Resistance Band Set",
      unit_cost_cents: 1120,
      currency: "AUD",
      min_order_quantity: 25,
      lead_time_days: 6,
      reliability_score: 0.92,
      margin_percent: 55,
      supplier_url: "https://supplier.example/bands",
      notes: "Local fulfilment and strong reviews.",
    },
  ],
  recommended_candidate_id: "candidate_1",
  rationale: "Best margin with local delivery.",
  confidence: 0.87,
  workflow_id: "wf_sourcing_1",
  created_at: "2026-05-08T01:00:00Z",
  updated_at: "2026-05-08T01:05:00Z",
};

const rawStrategy = {
  id: "pricing_margin_default",
  name: "Margin guardrail",
  strategy: "margin_based",
  enabled: true,
  target_margin_percent: 48,
  min_margin_percent: 35,
  max_price_cents: 3995,
  min_price_cents: 1995,
  updated_at: "2026-05-08T01:10:00Z",
};

const rawPricingRecommendation = {
  id: "price_rec_1",
  product_id: "prod_1",
  product_title: "Resistance Band Set",
  current_price_cents: 2495,
  recommended_price_cents: 2795,
  currency: "AUD",
  expected_margin_percent: 52,
  strategy_id: "pricing_margin_default",
  rationale: "Competitor median moved higher.",
  status: "pending",
  workflow_id: "wf_pricing_1",
  created_at: "2026-05-08T01:11:00Z",
};

const rawSchedule = {
  id: "schedule_sourcing_daily",
  agent_id: "agent_sourcing",
  agent_name: "Sourcing Agent",
  enabled: true,
  frequency: "daily",
  cron_expression: "0 8 * * *",
  timezone: "Australia/Melbourne",
  parameters: { category: "fitness", max_candidates: 5 },
  next_run_at: "2026-05-09T08:00:00+10:00",
  workflow_id: "wf_schedule_1",
  updated_at: "2026-05-08T01:15:00Z",
};

describe("agent automation API adapters", () => {
  it("fetches sourcing recommendations and preserves workflow ids", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ recommendations: [rawRecommendation] }));

    const recommendations = await fetchSourcingRecommendations({
      baseUrl: "http://api.test",
      fetchImpl: mockFetch,
    });

    expect(recommendations[0]?.workflowId).toBe("wf_sourcing_1");
    expect(recommendations[0]?.candidates[0]?.supplierName).toBe("Sydney Fitness Supply");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/agents/sourcing/recommendations",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("posts approve, reject, or adjust decisions for sourcing recommendations", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      jsonResponse({
        recommendation: { ...rawRecommendation, status: "adjusted" },
      }),
    );

    const recommendation = await decideSourcingRecommendation({
      baseUrl: "http://api.test",
      recommendationId: "rec_1",
      decision: "adjust",
      candidateId: "candidate_1",
      adjustedUnitCostCents: 1050,
      note: "Negotiate first order.",
      fetchImpl: mockFetch,
    });

    expect(recommendation.status).toBe("adjusted");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/agents/sourcing/recommendations/rec_1/decision",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          decision: "adjust",
          candidate_id: "candidate_1",
          adjusted_unit_cost_cents: 1050,
          note: "Negotiate first order.",
        }),
      }),
    );
  });

  it("fetches and updates pricing rules", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ strategies: [rawStrategy] }))
      .mockResolvedValueOnce(jsonResponse({ strategy: { ...rawStrategy, enabled: false } }));

    const strategies = await fetchPricingStrategies({ baseUrl: "http://api.test", fetchImpl });
    const updated = await updatePricingStrategy({
      baseUrl: "http://api.test",
      strategyId: "pricing_margin_default",
      enabled: false,
      targetMarginPercent: 45,
      fetchImpl,
    });

    expect(strategies[0]?.targetMarginPercent).toBe(48);
    expect(updated.enabled).toBe(false);
    expect(fetchImpl).toHaveBeenLastCalledWith(
      "http://api.test/api/v1/agents/pricing/strategies/pricing_margin_default",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ enabled: false, target_margin_percent: 45 }),
      }),
    );
  });

  it("fetches pricing recommendations", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ recommendations: [rawPricingRecommendation] }));

    const recommendations = await fetchPricingRecommendations({
      baseUrl: "http://api.test",
      fetchImpl,
    });

    expect(recommendations[0]?.recommendedPriceCents).toBe(2795);
    expect(recommendations[0]?.workflowId).toBe("wf_pricing_1");
  });

  it("fetches and updates agent schedules", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ schedules: [rawSchedule] }))
      .mockResolvedValueOnce(jsonResponse({ schedule: { ...rawSchedule, enabled: false } }));

    const schedules = await fetchAgentSchedules({ baseUrl: "http://api.test", fetchImpl });
    const updated = await updateAgentSchedule({
      baseUrl: "http://api.test",
      scheduleId: "schedule_sourcing_daily",
      enabled: false,
      frequency: "weekly",
      parameters: { category: "fitness", maxCandidates: 3 },
      fetchImpl,
    });

    expect(schedules[0]?.parameters).toEqual({ category: "fitness", max_candidates: 5 });
    expect(updated.enabled).toBe(false);
    expect(fetchImpl).toHaveBeenLastCalledWith(
      "http://api.test/api/v1/agents/schedules/schedule_sourcing_daily",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          enabled: false,
          frequency: "weekly",
          parameters: { category: "fitness", maxCandidates: 3 },
        }),
      }),
    );
  });

  it("wraps HTTP and malformed contract failures", async () => {
    await expect(
      fetchSourcingRecommendations({
        baseUrl: "http://api.test",
        fetchImpl: vi.fn().mockResolvedValue(jsonResponse({ error: "boom" }, { status: 500 })),
      }),
    ).rejects.toBeInstanceOf(AgentAutomationApiError);

    await expect(
      fetchAgentSchedules({
        baseUrl: "http://api.test",
        fetchImpl: vi
          .fn()
          .mockResolvedValue(
            jsonResponse({ schedules: [{ ...rawSchedule, frequency: "yearly" }] }),
          ),
      }),
    ).rejects.toBeInstanceOf(AgentAutomationApiError);
  });

  it("handles minimal optional fields across list endpoints", async () => {
    const minimalRecommendation = {
      ...rawRecommendation,
      recommended_candidate_id: undefined,
      workflow_id: undefined,
      candidates: [
        {
          ...rawRecommendation.candidates[0],
          sku: undefined,
          supplier_url: undefined,
          notes: undefined,
        },
      ],
    };
    const minimalStrategy = {
      ...rawStrategy,
      max_price_cents: undefined,
      min_price_cents: undefined,
      competitors_tracked: undefined,
    };
    const minimalSchedule = {
      ...rawSchedule,
      cron_expression: undefined,
      parameters: undefined,
      next_run_at: undefined,
      workflow_id: undefined,
    };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ recommendations: [minimalRecommendation] }))
      .mockResolvedValueOnce(jsonResponse({ strategies: [minimalStrategy] }))
      .mockResolvedValueOnce(jsonResponse({ schedules: [minimalSchedule] }));

    const recommendations = await fetchSourcingRecommendations({
      baseUrl: "http://api.test",
      fetchImpl,
    });
    const strategies = await fetchPricingStrategies({ baseUrl: "http://api.test", fetchImpl });
    const schedules = await fetchAgentSchedules({ baseUrl: "http://api.test", fetchImpl });

    expect(recommendations[0]?.workflowId).toBeUndefined();
    expect(strategies[0]?.maxPriceCents).toBeUndefined();
    expect(schedules[0]?.parameters).toEqual({});
  });

  it("rejects missing ids, invalid JSON, network errors, and missing mutation envelopes", async () => {
    await expect(
      fetchSourcingRecommendations({
        baseUrl: "",
        fetchImpl: vi.fn(),
      }),
    ).rejects.toBeInstanceOf(AgentAutomationApiError);

    await expect(
      fetchPricingStrategies({
        baseUrl: "http://api.test",
        fetchImpl: vi.fn().mockResolvedValue(new Response("{not-json", { status: 200 })),
      }),
    ).rejects.toBeInstanceOf(AgentAutomationApiError);

    await expect(
      fetchPricingRecommendations({
        baseUrl: "http://api.test",
        fetchImpl: vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
      }),
    ).rejects.toBeInstanceOf(AgentAutomationApiError);

    await expect(
      decideSourcingRecommendation({
        baseUrl: "http://api.test",
        recommendationId: "",
        decision: "reject",
        fetchImpl: vi.fn(),
      }),
    ).rejects.toBeInstanceOf(AgentAutomationApiError);

    await expect(
      decideSourcingRecommendation({
        baseUrl: "http://api.test",
        recommendationId: "rec_1",
        decision: "reject",
        fetchImpl: vi.fn().mockResolvedValue(jsonResponse({})),
      }),
    ).rejects.toBeInstanceOf(AgentAutomationApiError);

    await expect(
      updatePricingStrategy({
        baseUrl: "http://api.test",
        strategyId: "",
        fetchImpl: vi.fn(),
      }),
    ).rejects.toBeInstanceOf(AgentAutomationApiError);

    await expect(
      updateAgentSchedule({
        baseUrl: "http://api.test",
        scheduleId: "schedule_sourcing_daily",
        fetchImpl: vi.fn().mockResolvedValue(jsonResponse({})),
      }),
    ).rejects.toBeInstanceOf(AgentAutomationApiError);
  });
});
