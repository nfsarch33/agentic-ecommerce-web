import { describe, expect, it, vi } from "vitest";
import { RegistrationApiError } from "@/lib/adapters/api/register";
import { submitRegistrationUsecase } from "./submit-registration";

const okResponse = {
  registration: {
    id: "reg_1",
    email: "alice@example.com",
    slugRequested: "tenant-a",
    planRequested: "free",
    status: "pending_email_verification" as const,
  },
  message: "Check your email.",
};

describe("submitRegistrationUsecase", () => {
  it("rejects invalid email before calling adapter", async () => {
    const impl = vi.fn();
    const out = await submitRegistrationUsecase(
      { baseUrl: "http://x", email: "no", slugRequested: "tenant-a" },
      { impl: impl as unknown as NonNullable<Parameters<typeof submitRegistrationUsecase>[1]>["impl"] },
    );
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.code).toBe("email_required");
    expect(impl).not.toHaveBeenCalled();
  });

  it("rejects bad slug", async () => {
    const out = await submitRegistrationUsecase({
      baseUrl: "http://x",
      email: "alice@example.com",
      slugRequested: "BAD",
    });
    expect(out.ok).toBe(false);
  });

  it("returns ok on success", async () => {
    const impl = vi.fn(async () => okResponse);
    const out = await submitRegistrationUsecase(
      { baseUrl: "http://x", email: "alice@example.com", slugRequested: "tenant-a" },
      { impl },
    );
    expect(out.ok).toBe(true);
  });

  it("translates RegistrationApiError to error code", async () => {
    const impl = vi.fn(async () => {
      throw new RegistrationApiError("slug taken", 409, "slug_taken");
    });
    const out = await submitRegistrationUsecase(
      { baseUrl: "http://x", email: "alice@example.com", slugRequested: "tenant-a" },
      { impl },
    );
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.code).toBe("slug_taken");
  });

  it("falls back for unknown error", async () => {
    const impl = vi.fn(async () => {
      throw "string-error";
    });
    const out = await submitRegistrationUsecase(
      { baseUrl: "http://x", email: "alice@example.com", slugRequested: "tenant-a" },
      { impl },
    );
    expect(out.ok).toBe(false);
  });
});
