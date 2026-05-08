import { describe, expect, it, vi } from "vitest";
import { RegistrationApiError } from "@/lib/adapters/api/register";
import { verifyEmailUsecase } from "./verify-email";

const reg = {
  id: "reg_1",
  email: "alice@example.com",
  slugRequested: "tenant-a",
  planRequested: "free",
  status: "email_verified" as const,
};

describe("verifyEmailUsecase", () => {
  it("requires token", async () => {
    const impl = vi.fn();
    const out = await verifyEmailUsecase(
      { baseUrl: "http://x", token: "" },
      { impl: impl as unknown as NonNullable<Parameters<typeof verifyEmailUsecase>[1]>["impl"] },
    );
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.code).toBe("token_required");
    expect(impl).not.toHaveBeenCalled();
  });

  it("returns registration on success", async () => {
    const out = await verifyEmailUsecase(
      { baseUrl: "http://x", token: "tok" },
      { impl: async () => reg },
    );
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.registration.status).toBe("email_verified");
  });

  it("translates api error", async () => {
    const out = await verifyEmailUsecase(
      { baseUrl: "http://x", token: "tok" },
      {
        impl: async () => {
          throw new RegistrationApiError("token invalid", 401, "token_invalid");
        },
      },
    );
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.code).toBe("token_invalid");
  });

  it("translates unknown error", async () => {
    const out = await verifyEmailUsecase(
      { baseUrl: "http://x", token: "tok" },
      {
        impl: async () => {
          throw 1;
        },
      },
    );
    expect(out.ok).toBe(false);
  });
});
