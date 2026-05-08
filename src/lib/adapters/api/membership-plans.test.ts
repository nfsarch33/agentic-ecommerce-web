import { describe, expect, it } from "vitest";
import {
  createMembershipPlan,
  deleteMembershipPlan,
  fetchMembershipPlan,
  listMembershipPlans,
  MembershipPlansApiError,
  parsePlan,
  updateMembershipPlan,
} from "./membership-plans";

const samplePlanRaw = {
  id: "plan-1",
  tenant_id: "tenant-a",
  name: "Pro",
  description: "All-access",
  billing_cycle: "monthly",
  price: { amount: 2900, currency: "AUD" },
  benefits: ["benefit a", "benefit b"],
  stripe_price_id: "price_123",
  created_at: "2026-05-08T07:30:00Z",
  updated_at: "2026-05-08T07:30:00Z",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("parsePlan", () => {
  it("round-trips a fully populated plan", () => {
    const plan = parsePlan(samplePlanRaw);
    expect(plan.id).toBe("plan-1");
    expect(plan.tenantId).toBe("tenant-a");
    expect(plan.billingCycle).toBe("monthly");
    expect(plan.price).toEqual({ amount: 2900, currency: "AUD" });
    expect(plan.benefits).toEqual(["benefit a", "benefit b"]);
    expect(plan.stripePriceId).toBe("price_123");
  });

  it("treats missing optional fields as undefined", () => {
    const plan = parsePlan({ ...samplePlanRaw, description: "", stripe_price_id: "" });
    expect(plan.description).toBeUndefined();
    expect(plan.stripePriceId).toBeUndefined();
  });

  it("rejects unknown billing cycle", () => {
    expect(() => parsePlan({ ...samplePlanRaw, billing_cycle: "weekly" })).toThrow(
      MembershipPlansApiError,
    );
  });

  it("rejects non-array benefits", () => {
    expect(() => parsePlan({ ...samplePlanRaw, benefits: "not an array" })).toThrow(
      MembershipPlansApiError,
    );
  });

  it("rejects bad money amount", () => {
    expect(() => parsePlan({ ...samplePlanRaw, price: { amount: 0.5, currency: "AUD" } })).toThrow(
      MembershipPlansApiError,
    );
  });
});

describe("listMembershipPlans", () => {
  it("sends tenant header and parses list", async () => {
    let captured: { url: string; init?: RequestInit } | null = null;
    const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
      captured = { url: String(url), init };
      return jsonResponse({
        plans: [samplePlanRaw],
        total: 1,
        page: 1,
        per_page: 20,
      });
    }) as typeof fetch;
    const result = await listMembershipPlans({
      baseUrl: "http://api.test",
      tenantId: "tenant-a",
      page: 1,
      perPage: 20,
      fetchImpl,
    });
    expect(result.plans).toHaveLength(1);
    expect(result.plans[0]?.id).toBe("plan-1");
    expect(captured).not.toBeNull();
    expect(captured!.url).toBe("http://api.test/api/v1/membership-plans?page=1&per_page=20");
    expect((captured!.init?.headers as Record<string, string>)?.["x-tenant-id"]).toBe("tenant-a");
  });

  it("rejects missing baseUrl", async () => {
    await expect(
      listMembershipPlans({
        baseUrl: "",
        tenantId: "tenant-a",
      }),
    ).rejects.toThrow(MembershipPlansApiError);
  });

  it("propagates HTTP non-2xx as ApiError", async () => {
    const fetchImpl = (async () => jsonResponse({ error: "internal" }, 500)) as typeof fetch;
    await expect(
      listMembershipPlans({ baseUrl: "http://api.test", tenantId: "tenant-a", fetchImpl }),
    ).rejects.toThrow(/HTTP 500/);
  });
});

describe("fetchMembershipPlan", () => {
  it("returns parsed plan on 200", async () => {
    const fetchImpl = (async () => jsonResponse(samplePlanRaw)) as typeof fetch;
    const plan = await fetchMembershipPlan({
      baseUrl: "http://api.test",
      tenantId: "tenant-a",
      planId: "plan-1",
      fetchImpl,
    });
    expect(plan.id).toBe("plan-1");
  });

  it("rejects empty planId", async () => {
    await expect(
      fetchMembershipPlan({ baseUrl: "http://api.test", tenantId: "tenant-a", planId: "" }),
    ).rejects.toThrow(MembershipPlansApiError);
  });
});

describe("createMembershipPlan", () => {
  it("posts the plan body and parses response", async () => {
    let captured: RequestInit | undefined;
    const fetchImpl = (async (_url: string | URL | Request, init?: RequestInit) => {
      captured = init;
      return jsonResponse(samplePlanRaw, 201);
    }) as typeof fetch;
    await createMembershipPlan({
      baseUrl: "http://api.test",
      tenantId: "tenant-a",
      plan: {
        name: "Pro",
        billingCycle: "monthly",
        price: { amount: 2900, currency: "AUD" },
        benefits: ["a"],
      },
      fetchImpl,
    });
    expect(captured?.method).toBe("POST");
    const body = JSON.parse((captured?.body as string) ?? "{}");
    expect(body.name).toBe("Pro");
    expect(body.billing_cycle).toBe("monthly");
    expect(body.price).toEqual({ amount: 2900, currency: "AUD" });
  });
});

describe("updateMembershipPlan", () => {
  it("PATCHes the plan with partial body", async () => {
    let captured: { method?: string; body?: unknown } = {};
    const fetchImpl = (async (_url: string | URL | Request, init?: RequestInit) => {
      captured = { method: init?.method, body: init?.body };
      return jsonResponse({ ...samplePlanRaw, name: "Pro Plus" });
    }) as typeof fetch;
    const updated = await updateMembershipPlan({
      baseUrl: "http://api.test",
      tenantId: "tenant-a",
      planId: "plan-1",
      plan: { name: "Pro Plus" },
      fetchImpl,
    });
    expect(captured.method).toBe("PATCH");
    expect(JSON.parse(captured.body as string)).toEqual({ name: "Pro Plus" });
    expect(updated.name).toBe("Pro Plus");
  });
});

describe("deleteMembershipPlan", () => {
  it("returns void on 204", async () => {
    const fetchImpl = (async () => new Response(null, { status: 204 })) as typeof fetch;
    await expect(
      deleteMembershipPlan({
        baseUrl: "http://api.test",
        tenantId: "tenant-a",
        planId: "plan-1",
        fetchImpl,
      }),
    ).resolves.toBeUndefined();
  });

  it("throws on HTTP 500", async () => {
    const fetchImpl = (async () => new Response(null, { status: 500 })) as typeof fetch;
    await expect(
      deleteMembershipPlan({
        baseUrl: "http://api.test",
        tenantId: "tenant-a",
        planId: "plan-1",
        fetchImpl,
      }),
    ).rejects.toThrow(/HTTP 500/);
  });
});
