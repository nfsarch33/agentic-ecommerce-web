import { describe, expect, it, vi } from "vitest";
import {
  TenantsApiError,
  activateTenant,
  archiveTenant,
  createTenant,
  fetchTenant,
  listTenants,
  parseTenant,
  suspendTenant,
  updateTenant,
} from "./tenants";

const baseTenant = {
  id: "acme",
  slug: "acme",
  name: "Acme",
  plan: "free",
  status: "provisioning",
  created_at: "2026-05-08T10:00:00Z",
  updated_at: "2026-05-08T10:00:00Z",
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("tenants adapter", () => {
  it("listTenants paginates", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ tenants: [baseTenant], total: 1, page: 1, per_page: 20 }),
    );
    const out = await listTenants({ baseUrl: "http://api.test", fetchImpl });
    expect(out.tenants[0]?.slug).toBe("acme");
  });

  it("listTenants surfaces HTTP errors", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 500 }));
    await expect(listTenants({ baseUrl: "http://x", fetchImpl })).rejects.toBeInstanceOf(TenantsApiError);
  });

  it("listTenants surfaces network errors", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("offline");
    });
    await expect(listTenants({ baseUrl: "http://x", fetchImpl })).rejects.toBeInstanceOf(TenantsApiError);
  });

  it("listTenants rejects non-array tenants", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ tenants: "x" }));
    await expect(listTenants({ baseUrl: "http://x", fetchImpl })).rejects.toBeInstanceOf(TenantsApiError);
  });

  it("fetchTenant round-trips", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(baseTenant));
    const out = await fetchTenant({ baseUrl: "http://x", id: "acme", fetchImpl });
    expect(out.name).toBe("Acme");
  });

  it("fetchTenant requires id", async () => {
    await expect(fetchTenant({ baseUrl: "http://x", id: "", fetchImpl: vi.fn() })).rejects.toBeInstanceOf(
      TenantsApiError,
    );
  });

  it("createTenant POSTs body", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(baseTenant, 201));
    const out = await createTenant({ baseUrl: "http://x", slug: "acme", name: "Acme", fetchImpl });
    expect(out.slug).toBe("acme");
    const args = (fetchImpl.mock.calls[0] ?? []) as unknown[];
    const init = args[1] as RequestInit;
    expect(init.method).toBe("POST");
  });

  it("updateTenant PATCHes only provided fields", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ ...baseTenant, name: "Renamed" }));
    const out = await updateTenant({ baseUrl: "http://x", id: "acme", name: "Renamed", fetchImpl });
    expect(out.name).toBe("Renamed");
  });

  it("transitions hit the action paths", async () => {
    for (const action of ["activate", "suspend", "archive"] as const) {
      const fetchImpl = vi.fn(async () => jsonResponse({ ...baseTenant, status: action === "activate" ? "active" : action === "suspend" ? "suspended" : "archived" }));
      const helper = action === "activate" ? activateTenant : action === "suspend" ? suspendTenant : archiveTenant;
      const out = await helper({ baseUrl: "http://x", id: "acme", fetchImpl });
      expect(out.id).toBe("acme");
    }
  });

  it("parseTenant rejects invalid payloads", () => {
    expect(() => parseTenant({})).toThrow(TenantsApiError);
    expect(() => parseTenant({ ...baseTenant, status: "ghost" })).toThrow(TenantsApiError);
  });
});
