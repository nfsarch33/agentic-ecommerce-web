import { describe, expect, it, vi } from "vitest";
import {
  RegistrationApiError,
  completeRegistrationOnboarding,
  parseRegistration,
  submitRegistration,
  verifyRegistration,
} from "./register";

const okHeaders = new Headers({ "content-type": "application/json" });

describe("register adapter", () => {
  it("submitRegistration posts and parses", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          registration: {
            id: "reg_1",
            email: "alice@example.com",
            slug_requested: "tenant-a",
            plan_requested: "free",
            status: "pending_email_verification",
          },
          message: "ok",
        }),
        { status: 202, headers: okHeaders },
      ),
    );
    const out = await submitRegistration({
      baseUrl: "http://localhost:8080",
      email: "alice@example.com",
      slugRequested: "tenant-a",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(out.registration.id).toBe("reg_1");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("submitRegistration surfaces backend error code", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ error: "slug_taken" }), { status: 409, headers: okHeaders }),
    );
    await expect(
      submitRegistration({
        baseUrl: "http://localhost:8080",
        email: "alice@example.com",
        slugRequested: "tenant-a",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toMatchObject({ status: 409, code: "slug_taken" });
  });

  it("submitRegistration network error", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    });
    await expect(
      submitRegistration({
        baseUrl: "http://localhost:8080",
        email: "alice@example.com",
        slugRequested: "tenant-a",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toBeInstanceOf(RegistrationApiError);
  });

  it("verifyRegistration", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          id: "reg_1",
          email: "alice@example.com",
          slug_requested: "tenant-a",
          plan_requested: "free",
          status: "email_verified",
        }),
        { status: 200, headers: okHeaders },
      ),
    );
    const out = await verifyRegistration({
      baseUrl: "http://localhost:8080",
      token: "tok",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(out.status).toBe("email_verified");
  });

  it("completeRegistrationOnboarding parses tenant", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          registration: {
            id: "reg_1",
            email: "alice@example.com",
            slug_requested: "tenant-a",
            plan_requested: "free",
            status: "active",
            tenant_id: "tenant-a",
          },
          tenant: {
            id: "tenant-a",
            slug: "tenant-a",
            name: "Acme",
            plan: "starter",
            status: "active",
            created_at: "2026-05-08T00:00:00Z",
            updated_at: "2026-05-08T00:00:00Z",
          },
        }),
        { status: 200, headers: okHeaders },
      ),
    );
    const out = await completeRegistrationOnboarding({
      baseUrl: "http://localhost:8080",
      registrationId: "reg_1",
      companyName: "Acme",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(out.tenant.plan).toBe("starter");
  });

  it("parseRegistration throws on bad status", () => {
    expect(() =>
      parseRegistration({
        id: "x",
        email: "a@b.c",
        slug_requested: "t",
        plan_requested: "free",
        status: "garbage",
      }),
    ).toThrow();
  });
});
