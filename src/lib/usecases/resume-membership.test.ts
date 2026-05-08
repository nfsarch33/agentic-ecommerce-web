import { describe, expect, it, vi } from "vitest";
import { resumeMembershipUsecase } from "./resume-membership";
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

describe("resumeMembershipUsecase", () => {
  it("allows resume only from paused", async () => {
    const resumeImpl = vi.fn(async () => ({ ...sub("paused"), state: "active" as const }));
    const result = await resumeMembershipUsecase(
      { membership: sub("paused") },
      { baseUrl: "http://api.test", tenantId: "tenant-a", resumeImpl },
    );
    expect(result.state).toBe("active");
    expect(resumeImpl).toHaveBeenCalledOnce();
  });

  it.each(["trial", "active", "cancelled", "expired"] as const)(
    "rejects resume from %s",
    async (state) => {
      await expect(
        resumeMembershipUsecase(
          { membership: sub(state) },
          { baseUrl: "http://api.test", tenantId: "tenant-a", resumeImpl: vi.fn() },
        ),
      ).rejects.toThrow(IllegalMembershipTransitionError);
    },
  );
});
