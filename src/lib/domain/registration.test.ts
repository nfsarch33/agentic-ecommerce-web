import { describe, expect, it } from "vitest";
import {
  REGISTRATION_WIZARD_STEPS,
  SUPPORTED_PLANS,
  isAtOrAfter,
  isRegistrationStatus,
  isSupportedPlan,
  isValidEmail,
  isValidSlug,
  statusRank,
} from "./registration";

describe("registration domain", () => {
  it("validates emails", () => {
    expect(isValidEmail("alice@example.com")).toBe(true);
    expect(isValidEmail("a@b.c")).toBe(true);
    expect(isValidEmail("no-at")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });

  it("validates slugs", () => {
    expect(isValidSlug("acme-corp")).toBe(true);
    expect(isValidSlug("ab")).toBe(true);
    expect(isValidSlug("UpperCase")).toBe(false);
    expect(isValidSlug("ends-with-dash-")).toBe(false);
    expect(isValidSlug("9starts")).toBe(false);
    expect(isValidSlug("a")).toBe(false);
  });

  it("orders statuses", () => {
    expect(statusRank("pending_email_verification")).toBe(0);
    expect(statusRank("active")).toBe(3);
    expect(isAtOrAfter("active", "email_verified")).toBe(true);
    expect(isAtOrAfter("pending_email_verification", "active")).toBe(false);
  });

  it("registration status type predicate", () => {
    expect(isRegistrationStatus("active")).toBe(true);
    expect(isRegistrationStatus("garbage")).toBe(false);
  });

  it("supported plans", () => {
    expect(SUPPORTED_PLANS.length).toBe(3);
    expect(isSupportedPlan("starter")).toBe(true);
    expect(isSupportedPlan("garbage")).toBe(false);
  });

  it("wizard steps cover the full flow", () => {
    expect(REGISTRATION_WIZARD_STEPS.length).toBe(4);
    expect(REGISTRATION_WIZARD_STEPS[0]?.id).toBe("submit");
    expect(REGISTRATION_WIZARD_STEPS[REGISTRATION_WIZARD_STEPS.length - 1]?.id).toBe("active");
  });
});
