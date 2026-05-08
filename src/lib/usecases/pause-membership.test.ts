import { describe, expect, it, vi } from "vitest";
import { pauseMembershipUsecase } from "./pause-membership";
import { IllegalMembershipTransitionError } from "./cancel-membership";
import type { Subscription } from "@/lib/domain/membership";

function sub(state: Subscription["state"]): Subscription {
  return {
    id: "sub-1",
    tenantId: "tenant-a",
    memberId: "mem-1",
    memberEmail: "alice@example.com",
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

describe("pauseMembershipUsecase", () => {
  it("allows pause only from active", async () => {
    const pauseImpl = vi.fn(async () => ({ ...sub("active"), state: "paused" as const }));
    const result = await pauseMembershipUsecase(
      { membership: sub("active") },
      { baseUrl: "http://api.test", tenantId: "tenant-a", pauseImpl },
    );
    expect(result.state).toBe("paused");
    expect(pauseImpl).toHaveBeenCalledOnce();
  });

  it.each(["trial", "paused", "cancelled", "expired"] as const)(
    "rejects pause from %s",
    async (state) => {
      await expect(
        pauseMembershipUsecase(
          { membership: sub(state) },
          { baseUrl: "http://api.test", tenantId: "tenant-a", pauseImpl: vi.fn() },
        ),
      ).rejects.toThrow(IllegalMembershipTransitionError);
    },
  );
});
