import { describe, expect, it, vi } from "vitest";
import { BillingApiError } from "@/lib/adapters/api/billing";
import {
  cancelSubscriptionUsecase,
  pauseSubscriptionUsecase,
  resumeSubscriptionUsecase,
} from "./billing-actions";

const sub = (state: import("@/lib/domain/billing").SubscriptionState) => ({
  id: "sub_1",
  tenantId: "tenant-a",
  planId: "starter",
  state,
  currentPeriodStart: "2026-05-08T00:00:00Z",
  currentPeriodEnd: "2026-06-07T00:00:00Z",
  cancelAtPeriodEnd: false,
  createdAt: "2026-05-08T00:00:00Z",
  updatedAt: "2026-05-08T00:00:00Z",
});

describe("billing-actions usecases", () => {
  it("pauseSubscriptionUsecase rejects illegal state", async () => {
    const impl = vi.fn();
    const out = await pauseSubscriptionUsecase(
      { state: "canceled" },
      { baseUrl: "http://x", tenantId: "t", id: "sub_1" },
      { pauseImpl: impl as unknown as NonNullable<Parameters<typeof pauseSubscriptionUsecase>[2]>["pauseImpl"] },
    );
    expect(out.ok).toBe(false);
    expect(impl).not.toHaveBeenCalled();
  });

  it("pauseSubscriptionUsecase ok", async () => {
    const out = await pauseSubscriptionUsecase(
      { state: "active" },
      { baseUrl: "http://x", tenantId: "t", id: "sub_1" },
      { pauseImpl: async () => sub("paused") },
    );
    expect(out.ok).toBe(true);
  });

  it("resumeSubscriptionUsecase ok", async () => {
    const out = await resumeSubscriptionUsecase(
      { state: "paused" },
      { baseUrl: "http://x", tenantId: "t", id: "sub_1" },
      { resumeImpl: async () => sub("active") },
    );
    expect(out.ok).toBe(true);
  });

  it("cancelSubscriptionUsecase rejects from canceled", async () => {
    const out = await cancelSubscriptionUsecase(
      { state: "canceled" },
      { baseUrl: "http://x", tenantId: "t", id: "sub_1" },
    );
    expect(out.ok).toBe(false);
  });

  it("translates BillingApiError", async () => {
    const out = await pauseSubscriptionUsecase(
      { state: "active" },
      { baseUrl: "http://x", tenantId: "t", id: "sub_1" },
      {
        pauseImpl: async () => {
          throw new BillingApiError("nope", 422);
        },
      },
    );
    expect(out.ok).toBe(false);
  });

  it("translates unknown error", async () => {
    const out = await pauseSubscriptionUsecase(
      { state: "active" },
      { baseUrl: "http://x", tenantId: "t", id: "sub_1" },
      {
        pauseImpl: async () => {
          throw 1;
        },
      },
    );
    expect(out.ok).toBe(false);
  });
});
