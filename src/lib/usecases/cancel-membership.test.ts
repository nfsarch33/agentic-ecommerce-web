import { describe, expect, it, vi } from "vitest";
import {
  cancelMembershipUsecase,
  IllegalMembershipTransitionError,
} from "./cancel-membership";
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

describe("cancelMembershipUsecase", () => {
  it.each(["trial", "active", "paused"] as const)(
    "allows cancel from %s",
    async (state) => {
      const cancelImpl = vi.fn(async () => ({ ...sub(state), state: "cancelled" as const }));
      const result = await cancelMembershipUsecase(
        { membership: sub(state) },
        { baseUrl: "http://api.test", tenantId: "tenant-a", cancelImpl },
      );
      expect(result.state).toBe("cancelled");
      expect(cancelImpl).toHaveBeenCalledWith({
        baseUrl: "http://api.test",
        tenantId: "tenant-a",
        membershipId: "sub-1",
      });
    },
  );

  it.each(["cancelled", "expired"] as const)(
    "rejects cancel from terminal %s",
    async (state) => {
      const cancelImpl = vi.fn();
      await expect(
        cancelMembershipUsecase(
          { membership: sub(state) },
          { baseUrl: "http://api.test", tenantId: "tenant-a", cancelImpl },
        ),
      ).rejects.toThrow(IllegalMembershipTransitionError);
      expect(cancelImpl).not.toHaveBeenCalled();
    },
  );
});
