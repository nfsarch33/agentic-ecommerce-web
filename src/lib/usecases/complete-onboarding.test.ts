import { describe, expect, it, vi } from "vitest";
import { RegistrationApiError } from "@/lib/adapters/api/register";
import { completeOnboardingUsecase } from "./complete-onboarding";

const ok = {
  registration: {
    id: "reg_1",
    email: "alice@example.com",
    slugRequested: "tenant-a",
    planRequested: "starter",
    status: "active" as const,
    tenantId: "tenant-a",
  },
  tenant: {
    id: "tenant-a",
    slug: "tenant-a",
    name: "Acme",
    plan: "starter",
    status: "active",
    createdAt: "2026-05-08T00:00:00Z",
    updatedAt: "2026-05-08T00:00:00Z",
  },
};

describe("completeOnboardingUsecase", () => {
  it("requires registration id", async () => {
    const impl = vi.fn();
    const out = await completeOnboardingUsecase(
      { baseUrl: "http://x", registrationId: "", companyName: "Acme" },
      { impl: impl as unknown as NonNullable<Parameters<typeof completeOnboardingUsecase>[1]>["impl"] },
    );
    expect(out.ok).toBe(false);
    expect(impl).not.toHaveBeenCalled();
  });

  it("requires company name", async () => {
    const out = await completeOnboardingUsecase(
      { baseUrl: "http://x", registrationId: "reg_1", companyName: "  " },
    );
    expect(out.ok).toBe(false);
  });

  it("returns ok", async () => {
    const out = await completeOnboardingUsecase(
      { baseUrl: "http://x", registrationId: "reg_1", companyName: "Acme" },
      { impl: async () => ok },
    );
    expect(out.ok).toBe(true);
  });

  it("translates api error", async () => {
    const out = await completeOnboardingUsecase(
      { baseUrl: "http://x", registrationId: "reg_1", companyName: "Acme" },
      {
        impl: async () => {
          throw new RegistrationApiError("slug_taken", 409, "slug_taken");
        },
      },
    );
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.code).toBe("slug_taken");
  });

  it("translates unknown error", async () => {
    const out = await completeOnboardingUsecase(
      { baseUrl: "http://x", registrationId: "reg_1", companyName: "Acme" },
      {
        impl: async () => {
          throw 1;
        },
      },
    );
    expect(out.ok).toBe(false);
  });
});
