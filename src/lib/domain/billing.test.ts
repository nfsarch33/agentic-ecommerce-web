import { describe, expect, it } from "vitest";
import {
  IllegalSubscriptionTransitionError,
  canActivate,
  canCancel,
  canPause,
  canResume,
  formatMoneyMinor,
  isInvoiceStatus,
  isOverBudget,
  isSubscriptionState,
  nextSubscriptionState,
  usagePercent,
} from "./billing";

describe("billing domain", () => {
  it("guards every legal transition triple", () => {
    const cases: ReadonlyArray<readonly [Parameters<typeof nextSubscriptionState>[0], Parameters<typeof nextSubscriptionState>[1], Parameters<typeof nextSubscriptionState>[0]]> = [
      ["trialing", "activate", "active"],
      ["trialing", "cancel", "canceled"],
      ["active", "mark_past_due", "past_due"],
      ["active", "pause", "paused"],
      ["active", "cancel", "canceled"],
      ["past_due", "recover", "active"],
      ["past_due", "cancel", "canceled"],
      ["paused", "resume", "active"],
      ["paused", "cancel", "canceled"],
    ];
    for (const [from, via, to] of cases) {
      expect(nextSubscriptionState(from, via)).toBe(to);
    }
  });

  it("rejects illegal transitions with typed error", () => {
    expect(() => nextSubscriptionState("active", "resume")).toThrow(
      IllegalSubscriptionTransitionError,
    );
    expect(() => nextSubscriptionState("canceled", "activate")).toThrow(
      IllegalSubscriptionTransitionError,
    );
  });

  it("predicates match the table", () => {
    expect(canActivate("trialing")).toBe(true);
    expect(canPause("active")).toBe(true);
    expect(canResume("paused")).toBe(true);
    expect(canCancel("canceled")).toBe(false);
  });

  it("type predicates", () => {
    expect(isSubscriptionState("active")).toBe(true);
    expect(isSubscriptionState("garbage")).toBe(false);
    expect(isInvoiceStatus("paid")).toBe(true);
    expect(isInvoiceStatus("garbage")).toBe(false);
  });

  it("formats money minor", () => {
    expect(formatMoneyMinor(1900, "AUD")).toBe("19.00 AUD");
    expect(formatMoneyMinor(0, "USD")).toBe("0.00 USD");
  });

  it("usagePercent caps at 100", () => {
    expect(usagePercent(50, 100)).toBe(50);
    expect(usagePercent(150, 100)).toBe(100);
    expect(usagePercent(5, 0)).toBe(0);
  });

  it("isOverBudget thresholds", () => {
    expect(isOverBudget({ metric: "x", value: 80, limit: 100 })).toBe(true);
    expect(isOverBudget({ metric: "x", value: 50, limit: 100 })).toBe(false);
    expect(isOverBudget({ metric: "x", value: 5, limit: 0 })).toBe(false);
  });
});
