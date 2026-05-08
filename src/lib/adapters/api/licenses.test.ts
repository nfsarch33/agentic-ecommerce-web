import { describe, expect, it, vi } from "vitest";
import {
  LicensesApiError,
  customerLicenseDownload,
  fetchLicense,
  issueLicense,
  listLicenses,
  listMyLicenses,
  parseLicense,
  revokeLicense,
} from "./licenses";

const baseLicense = {
  id: "lic-1",
  tenant_id: "tenant-a",
  product_id: "prod-1",
  customer_id: "cust-1",
  key: "AAAAA-BBBBB-CCCCC-DDDDD-EEEEEEEE",
  state: "active",
  issued_at: "2026-05-08T12:00:00Z",
  expires_at: "2026-12-31T23:59:59Z",
  max_activations: 3,
  updated_at: "2026-05-08T12:00:00Z",
};

const baseDownload = {
  url: "https://cdn.example.com/api/v1/digital-downloads?lid=x&pid=y&tid=z&exp=1&uses=1&sig=abc",
  expires_at: "2026-05-08T12:05:00Z",
  uses_allowed: 3,
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("licenses adapter", () => {
  it("listLicenses parses the response", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ licenses: [baseLicense], total: 1, page: 1, per_page: 20 }),
    );
    const out = await listLicenses({
      baseUrl: "http://api.test",
      tenantId: "tenant-a",
      fetchImpl,
    });
    expect(out.licenses[0]?.state).toBe("active");
  });

  it("listMyLicenses passes pagination", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ licenses: [], total: 0, page: 3, per_page: 5 }),
    );
    await listMyLicenses({
      baseUrl: "http://api.test",
      tenantId: "tenant-a",
      page: 3,
      perPage: 5,
      fetchImpl,
    });
    const firstCall = (fetchImpl.mock.calls[0] ?? []) as unknown[];
    const url = String(firstCall[0] ?? "");
    expect(url).toContain("page=3");
    expect(url).toContain("per_page=5");
  });

  it("fetchLicense round-trips", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(baseLicense));
    const out = await fetchLicense({
      baseUrl: "http://api.test",
      tenantId: "tenant-a",
      id: "lic-1",
      fetchImpl,
    });
    expect(out.id).toBe("lic-1");
  });

  it("issueLicense posts the request body", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(baseLicense, 201));
    await issueLicense({
      baseUrl: "http://api.test",
      tenantId: "tenant-a",
      productId: "prod-1",
      customerId: "cust-1",
      source: "purchase",
      fetchImpl,
    });
    const firstCall = (fetchImpl.mock.calls[0] ?? []) as unknown[];
    const init = (firstCall[1] ?? {}) as RequestInit;
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toMatchObject({
      product_id: "prod-1",
      customer_id: "cust-1",
      source: "purchase",
    });
  });

  it("revokeLicense issues a POST", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ ...baseLicense, state: "revoked" }),
    );
    const out = await revokeLicense({
      baseUrl: "http://api.test",
      tenantId: "tenant-a",
      id: "lic-1",
      fetchImpl,
    });
    expect(out.state).toBe("revoked");
  });

  it("customerLicenseDownload returns the signed URL", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(baseDownload));
    const out = await customerLicenseDownload({
      baseUrl: "http://api.test",
      tenantId: "tenant-a",
      licenseId: "lic-1",
      fetchImpl,
    });
    expect(out.url).toBe(baseDownload.url);
    expect(out.usesAllowed).toBe(3);
  });

  it("customerLicenseDownload surfaces 410 for revoked licences", async () => {
    const fetchImpl = vi.fn(async () => new Response("gone", { status: 410 }));
    await expect(
      customerLicenseDownload({
        baseUrl: "http://api.test",
        tenantId: "tenant-a",
        licenseId: "lic-1",
        fetchImpl,
      }),
    ).rejects.toMatchObject({ message: expect.stringContaining("HTTP 410") });
  });

  it("parseLicense rejects rogue states", () => {
    expect(() => parseLicense({ ...baseLicense, state: "rogue" })).toThrow(LicensesApiError);
  });

  it("required arguments enforced", async () => {
    await expect(
      listLicenses({ baseUrl: "", tenantId: "tenant-a", fetchImpl: vi.fn() }),
    ).rejects.toBeInstanceOf(LicensesApiError);
    await expect(
      issueLicense({
        baseUrl: "http://api.test",
        tenantId: "",
        productId: "x",
        customerId: "y",
        fetchImpl: vi.fn(),
      }),
    ).rejects.toBeInstanceOf(LicensesApiError);
    await expect(
      revokeLicense({
        baseUrl: "http://api.test",
        tenantId: "tenant-a",
        id: "",
        fetchImpl: vi.fn(),
      }),
    ).rejects.toBeInstanceOf(LicensesApiError);
    await expect(
      customerLicenseDownload({
        baseUrl: "http://api.test",
        tenantId: "tenant-a",
        licenseId: "",
        fetchImpl: vi.fn(),
      }),
    ).rejects.toBeInstanceOf(LicensesApiError);
  });

  it("network errors are wrapped", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("fail");
    });
    await expect(
      listLicenses({ baseUrl: "http://api.test", tenantId: "tenant-a", fetchImpl }),
    ).rejects.toBeInstanceOf(LicensesApiError);
    await expect(
      listMyLicenses({ baseUrl: "http://api.test", tenantId: "tenant-a", fetchImpl }),
    ).rejects.toBeInstanceOf(LicensesApiError);
    await expect(
      fetchLicense({
        baseUrl: "http://api.test",
        tenantId: "tenant-a",
        id: "lic-1",
        fetchImpl,
      }),
    ).rejects.toBeInstanceOf(LicensesApiError);
    await expect(
      issueLicense({
        baseUrl: "http://api.test",
        tenantId: "tenant-a",
        productId: "p",
        customerId: "c",
        fetchImpl,
      }),
    ).rejects.toBeInstanceOf(LicensesApiError);
    await expect(
      revokeLicense({
        baseUrl: "http://api.test",
        tenantId: "tenant-a",
        id: "lic-1",
        fetchImpl,
      }),
    ).rejects.toBeInstanceOf(LicensesApiError);
    await expect(
      customerLicenseDownload({
        baseUrl: "http://api.test",
        tenantId: "tenant-a",
        licenseId: "lic-1",
        fetchImpl,
      }),
    ).rejects.toBeInstanceOf(LicensesApiError);
  });
});
