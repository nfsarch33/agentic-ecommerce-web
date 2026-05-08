import { describe, expect, it } from "vitest";
import {
  cancelMembership,
  createMembership,
  fetchMembership,
  listMemberships,
  MembershipsApiError,
  pauseMembership,
  resumeMembership,
} from "./memberships";

const samplePlanRaw = {
  id: "plan-1",
  tenant_id: "tenant-a",
  name: "Pro",
  description: "All-access",
  billing_cycle: "monthly",
  price: { amount: 2900, currency: "AUD" },
  benefits: ["benefit a"],
  stripe_price_id: "price_123",
  created_at: "2026-05-08T07:30:00Z",
  updated_at: "2026-05-08T07:30:00Z",
};

const sampleSubscriptionRaw = {
  id: "sub-1",
  tenant_id: "tenant-a",
  member_id: "mem-1",
  member_email: "alice@example.com",
  plan_id: "plan-1",
  state: "active",
  current_period_start: "2026-05-08T07:30:00Z",
  current_period_end: "2026-06-08T07:30:00Z",
  trial_ends_at: "2026-05-15T07:30:00Z",
  stripe_subscription_id: "sub_stripe_1",
  cancelled_at: null,
  created_at: "2026-05-08T07:30:00Z",
  updated_at: "2026-05-08T07:30:00Z",
  plan: samplePlanRaw,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("listMemberships", () => {
  it("returns parsed list on 200", async () => {
    let capturedUrl = "";
    let capturedHeaders: Record<string, string> = {};
    const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedHeaders = (init?.headers as Record<string, string>) ?? {};
      return jsonResponse({
        memberships: [sampleSubscriptionRaw],
        total: 1,
        page: 1,
        per_page: 20,
      });
    }) as typeof fetch;
    const result = await listMemberships({
      baseUrl: "http://api.test",
      tenantId: "tenant-a",
      page: 1,
      perPage: 20,
      fetchImpl,
    });
    expect(result.memberships).toHaveLength(1);
    expect(result.memberships[0]?.id).toBe("sub-1");
    expect(result.memberships[0]?.state).toBe("active");
    expect(result.memberships[0]?.plan.name).toBe("Pro");
    expect(capturedUrl).toBe("http://api.test/api/v1/memberships?page=1&per_page=20");
    expect(capturedHeaders["x-tenant-id"]).toBe("tenant-a");
  });

  it("rejects missing tenantId", async () => {
    await expect(
      listMemberships({ baseUrl: "http://api.test", tenantId: "" }),
    ).rejects.toThrow(MembershipsApiError);
  });

  it("propagates HTTP error as ApiError", async () => {
    const fetchImpl = (async () => jsonResponse({}, 403)) as typeof fetch;
    await expect(
      listMemberships({ baseUrl: "http://api.test", tenantId: "tenant-a", fetchImpl }),
    ).rejects.toThrow(/HTTP 403/);
  });
});

describe("fetchMembership", () => {
  it("returns subscription on 200", async () => {
    const fetchImpl = (async () => jsonResponse(sampleSubscriptionRaw)) as typeof fetch;
    const sub = await fetchMembership({
      baseUrl: "http://api.test",
      tenantId: "tenant-a",
      membershipId: "sub-1",
      fetchImpl,
    });
    expect(sub.id).toBe("sub-1");
  });

  it("rejects 404", async () => {
    const fetchImpl = (async () => jsonResponse({ error: "not_found" }, 404)) as typeof fetch;
    await expect(
      fetchMembership({
        baseUrl: "http://api.test",
        tenantId: "tenant-a",
        membershipId: "sub-1",
        fetchImpl,
      }),
    ).rejects.toThrow(/HTTP 404/);
  });
});

describe("createMembership", () => {
  it("sends member_email + plan_id and parses response", async () => {
    let captured: RequestInit | undefined;
    const fetchImpl = (async (_url: string | URL | Request, init?: RequestInit) => {
      captured = init;
      return jsonResponse(sampleSubscriptionRaw, 201);
    }) as typeof fetch;
    const sub = await createMembership({
      baseUrl: "http://api.test",
      tenantId: "tenant-a",
      memberEmail: "alice@example.com",
      planId: "plan-1",
      trialDays: 7,
      fetchImpl,
    });
    expect(sub.id).toBe("sub-1");
    const body = JSON.parse((captured?.body as string) ?? "{}");
    expect(body.member_email).toBe("alice@example.com");
    expect(body.plan_id).toBe("plan-1");
    expect(body.trial_days).toBe(7);
  });

  it("omits trial_days when zero", async () => {
    let captured: RequestInit | undefined;
    const fetchImpl = (async (_url: string | URL | Request, init?: RequestInit) => {
      captured = init;
      return jsonResponse(sampleSubscriptionRaw, 201);
    }) as typeof fetch;
    await createMembership({
      baseUrl: "http://api.test",
      tenantId: "tenant-a",
      memberEmail: "alice@example.com",
      planId: "plan-1",
      fetchImpl,
    });
    const body = JSON.parse((captured?.body as string) ?? "{}");
    expect(body.trial_days).toBeUndefined();
  });
});

describe("transitions", () => {
  it.each([
    { fn: cancelMembership, action: "cancel" },
    { fn: pauseMembership, action: "pause" },
    { fn: resumeMembership, action: "resume" },
  ])("$action posts to /memberships/{id}/$action", async ({ fn, action }) => {
    let capturedUrl = "";
    const fetchImpl = (async (url: string | URL | Request) => {
      capturedUrl = String(url);
      return jsonResponse(sampleSubscriptionRaw);
    }) as typeof fetch;
    await fn({
      baseUrl: "http://api.test",
      tenantId: "tenant-a",
      membershipId: "sub-1",
      fetchImpl,
    });
    expect(capturedUrl).toBe(`http://api.test/api/v1/memberships/sub-1/${action}`);
  });

  it("propagates 422 invalid_transition", async () => {
    const fetchImpl = (async () => jsonResponse({ error: "invalid_transition" }, 422)) as typeof fetch;
    await expect(
      cancelMembership({
        baseUrl: "http://api.test",
        tenantId: "tenant-a",
        membershipId: "sub-1",
        fetchImpl,
      }),
    ).rejects.toThrow(/HTTP 422/);
  });

  it("wraps network failures with ApiError for transitions", async () => {
    const fetchImpl = (async () => {
      throw new Error("network down");
    }) as typeof fetch;
    await expect(
      pauseMembership({
        baseUrl: "http://api.test",
        tenantId: "tenant-a",
        membershipId: "sub-1",
        fetchImpl,
      }),
    ).rejects.toThrow(MembershipsApiError);
  });

  it("rejects createMembership with network error", async () => {
    const fetchImpl = (async () => {
      throw new Error("network down");
    }) as typeof fetch;
    await expect(
      createMembership({
        baseUrl: "http://api.test",
        tenantId: "tenant-a",
        memberEmail: "alice@example.com",
        planId: "plan-1",
        fetchImpl,
      }),
    ).rejects.toThrow(MembershipsApiError);
  });

  it("rejects listMemberships network error", async () => {
    const fetchImpl = (async () => {
      throw new Error("network down");
    }) as typeof fetch;
    await expect(
      listMemberships({ baseUrl: "http://api.test", tenantId: "tenant-a", fetchImpl }),
    ).rejects.toThrow(MembershipsApiError);
  });

  it("requires non-empty membershipId for transition", async () => {
    await expect(
      cancelMembership({
        baseUrl: "http://api.test",
        tenantId: "tenant-a",
        membershipId: "",
      }),
    ).rejects.toThrow(MembershipsApiError);
  });

  it("rejects fetchMembership network error", async () => {
    const fetchImpl = (async () => {
      throw new Error("network down");
    }) as typeof fetch;
    await expect(
      fetchMembership({
        baseUrl: "http://api.test",
        tenantId: "tenant-a",
        membershipId: "sub-1",
        fetchImpl,
      }),
    ).rejects.toThrow(MembershipsApiError);
  });

  it("wraps invalid JSON from listMemberships as ApiError", async () => {
    const fetchImpl = (async () =>
      new Response("not json", {
        status: 200,
        headers: { "content-type": "application/json" },
      })) as typeof fetch;
    await expect(
      listMemberships({ baseUrl: "http://api.test", tenantId: "tenant-a", fetchImpl }),
    ).rejects.toThrow(/invalid JSON|memberships must be an array/);
  });

  it("rejects listMemberships when memberships is not an array", async () => {
    const fetchImpl = (async () =>
      jsonResponse({ memberships: "not-an-array", total: 0, page: 1, per_page: 0 })) as typeof fetch;
    await expect(
      listMemberships({ baseUrl: "http://api.test", tenantId: "tenant-a", fetchImpl }),
    ).rejects.toThrow(/memberships must be an array/);
  });

  it("rejects fetchMembership when subscription payload is malformed", async () => {
    const fetchImpl = (async () =>
      jsonResponse({ id: "sub-1", state: "active" })) as typeof fetch;
    await expect(
      fetchMembership({
        baseUrl: "http://api.test",
        tenantId: "tenant-a",
        membershipId: "sub-1",
        fetchImpl,
      }),
    ).rejects.toThrow(/subscription\.plan is required|subscription\..* must be/);
  });
});
