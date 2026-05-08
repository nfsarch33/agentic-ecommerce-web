import { describe, expect, it, vi } from "vitest";
import { TenantsApiError } from "@/lib/adapters/api/tenants";
import {
  activateTenantUsecase,
  archiveTenantUsecase,
  listTenantsUsecase,
  provisionTenantUsecase,
  suspendTenantUsecase,
} from "./provision-tenant";

const baseTenant = {
  id: "acme",
  slug: "acme",
  name: "Acme",
  plan: "free",
  status: "provisioning" as const,
  createdAt: "2026-05-08T10:00:00Z",
  updatedAt: "2026-05-08T10:00:00Z",
};

describe("tenant usecases", () => {
  it("provisionTenantUsecase enforces slug + name", async () => {
    const result = await provisionTenantUsecase(
      { baseUrl: "http://x", slug: "BAD", name: "Acme" },
      { createImpl: vi.fn() },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("kebab-case");

    const result2 = await provisionTenantUsecase(
      { baseUrl: "http://x", slug: "acme", name: "  " },
      { createImpl: vi.fn() },
    );
    expect(result2.ok).toBe(false);
  });

  it("provisionTenantUsecase forwards to adapter", async () => {
    const createImpl = vi.fn(async () => baseTenant);
    const result = await provisionTenantUsecase(
      { baseUrl: "http://x", slug: "acme", name: "Acme" },
      { createImpl },
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.tenant.slug).toBe("acme");
  });

  it("provisionTenantUsecase surfaces TenantsApiError", async () => {
    const createImpl = vi.fn(async () => {
      throw new TenantsApiError("conflict");
    });
    const result = await provisionTenantUsecase(
      { baseUrl: "http://x", slug: "acme", name: "Acme" },
      { createImpl },
    );
    expect(result).toEqual({ ok: false, error: "conflict" });
  });

  it("activate / suspend / archive forward to adapter", async () => {
    const activateImpl = vi.fn(async () => ({ ...baseTenant, status: "active" as const }));
    expect(await activateTenantUsecase({ baseUrl: "http://x", id: "acme" }, { activateImpl })).toEqual({
      ok: true,
      tenant: { ...baseTenant, status: "active" },
    });
    const suspendImpl = vi.fn(async () => ({ ...baseTenant, status: "suspended" as const }));
    expect(await suspendTenantUsecase({ baseUrl: "http://x", id: "acme" }, { suspendImpl })).toEqual({
      ok: true,
      tenant: { ...baseTenant, status: "suspended" },
    });
    const archiveImpl = vi.fn(async () => ({ ...baseTenant, status: "archived" as const }));
    expect(await archiveTenantUsecase({ baseUrl: "http://x", id: "acme" }, { archiveImpl })).toEqual({
      ok: true,
      tenant: { ...baseTenant, status: "archived" },
    });
  });

  it("listTenantsUsecase returns tenants on success", async () => {
    const listImpl = vi.fn(async () => ({ tenants: [baseTenant], total: 1, page: 1, perPage: 20 }));
    const result = await listTenantsUsecase({ baseUrl: "http://x" }, { listImpl });
    expect(result.tenants).toHaveLength(1);
  });

  it("listTenantsUsecase swallows TenantsApiError", async () => {
    const listImpl = vi.fn(async () => {
      throw new TenantsApiError("offline");
    });
    const result = await listTenantsUsecase({ baseUrl: "http://x" }, { listImpl });
    expect(result.tenants).toHaveLength(0);
    expect(result.error).toBe("offline");
  });

  it("activate usecase surfaces error", async () => {
    const activateImpl = vi.fn(async () => {
      throw new TenantsApiError("nope");
    });
    const result = await activateTenantUsecase({ baseUrl: "http://x", id: "acme" }, { activateImpl });
    expect(result).toEqual({ ok: false, error: "nope" });
  });
});
