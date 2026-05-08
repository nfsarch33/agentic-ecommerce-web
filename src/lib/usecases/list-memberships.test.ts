import { describe, expect, it } from "vitest";
import { listMembershipsUsecase } from "./list-memberships";
import type { Subscription } from "@/lib/domain/membership";
import type { MembershipsList } from "@/lib/adapters/api/memberships";

function sub(id: string, state: Subscription["state"]): Subscription {
  return {
    id,
    tenantId: "tenant-a",
    memberId: `mem-${id}`,
    memberEmail: `${id}@example.com`,
    planId: "plan-1",
    state,
    currentPeriodStart: "2026-05-08T07:30:00Z",
    currentPeriodEnd: "2026-06-08T07:30:00Z",
    trialEndsAt: "2026-05-15T07:30:00Z",
    createdAt: "2026-05-08T07:30:00Z",
    updatedAt: "2026-05-08T07:30:00Z",
    plan: {
      id: "plan-1",
      tenantId: "tenant-a",
      name: "Pro",
      billingCycle: "monthly",
      price: { amount: 2900, currency: "AUD" },
      benefits: [],
      createdAt: "2026-05-08T07:30:00Z",
      updatedAt: "2026-05-08T07:30:00Z",
    },
  };
}

describe("listMembershipsUsecase", () => {
  const subs: readonly Subscription[] = [
    sub("a", "active"),
    sub("b", "paused"),
    sub("c", "cancelled"),
    sub("d", "active"),
  ];

  function fakeFetch(): MembershipsList {
    return { memberships: subs, total: subs.length, page: 1, perPage: 20 };
  }

  it("returns all memberships and per-state counts when no filter", async () => {
    const result = await listMembershipsUsecase(
      {},
      {
        baseUrl: "http://api.test",
        tenantId: "tenant-a",
        fetchImpl: async () => fakeFetch(),
      },
    );
    expect(result.memberships).toHaveLength(4);
    expect(result.counts).toEqual({
      trial: 0,
      active: 2,
      paused: 1,
      cancelled: 1,
      expired: 0,
    });
  });

  it("filters by state without losing the global counts", async () => {
    const result = await listMembershipsUsecase(
      { state: "active" },
      {
        baseUrl: "http://api.test",
        tenantId: "tenant-a",
        fetchImpl: async () => fakeFetch(),
      },
    );
    expect(result.memberships).toHaveLength(2);
    expect(result.memberships.every((m) => m.state === "active")).toBe(true);
    expect(result.counts.cancelled).toBe(1);
  });

  it("forwards page + perPage to adapter", async () => {
    let captured: { page?: number; perPage?: number } = {};
    await listMembershipsUsecase(
      { page: 2, perPage: 50 },
      {
        baseUrl: "http://api.test",
        tenantId: "tenant-a",
        fetchImpl: async (opts) => {
          captured = { page: opts.page, perPage: opts.perPage };
          return { memberships: [], total: 0, page: 2, perPage: 50 };
        },
      },
    );
    expect(captured.page).toBe(2);
    expect(captured.perPage).toBe(50);
  });
});
