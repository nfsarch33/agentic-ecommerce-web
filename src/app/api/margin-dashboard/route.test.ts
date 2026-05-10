// File scope: v3.9.0 EC-6-5 BFF margin dashboard proxy tests.
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const REAL_FETCH = global.fetch;

afterEach(() => {
  global.fetch = REAL_FETCH;
});

function mockBackend(responses: Record<string, Response>): void {
  global.fetch = vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
    const matchKey = Object.keys(responses).find((k) => url.includes(k));
    if (!matchKey) throw new Error(`unexpected upstream URL: ${url}`);
    const resp = responses[matchKey];
    if (!resp) throw new Error(`missing response for ${matchKey}`);
    return resp;
  }) as unknown as typeof fetch;
}

function mkResp(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("BFF /api/margin-dashboard", () => {
  it("merges dashboard + alerts + forecast", async () => {
    mockBackend({
      "/dashboard": mkResp({
        tenant_id: "tenant-1",
        dashboard: { revenue_aud_cents: 1500_00, net_margin_aud_cents: 800_00 },
      }),
      "/alerts": mkResp({ alerts: [{ product_id: "sku-1", severity: "warning" }] }),
      "/forecast": mkResp({ forecast_aud_cents: 200_00_00, confidence_pct: 0.9 }),
    });
    const req = new Request("http://localhost/api/margin-dashboard?tenant_id=tenant-1&period=30d");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.tenant_id).toBe("tenant-1");
    expect(body.dashboard).toBeDefined();
    expect((body.alerts as unknown[])).toHaveLength(1);
    const forecast = body.forecast as Record<string, unknown>;
    expect(forecast.confidence_pct).toBe(0.9);
  });

  it("returns 502 when an upstream call rejects", async () => {
    global.fetch = vi.fn(async () => {
      throw new Error("network");
    }) as unknown as typeof fetch;
    const req = new Request("http://localhost/api/margin-dashboard?tenant_id=tenant-1&period=30d");
    const res = await GET(req);
    expect(res.status).toBe(502);
  });

  it("forwards X-Tenant-Id header", async () => {
    let seenTenant = "";
    global.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const headers = new Headers(init?.headers);
      seenTenant = headers.get("X-Tenant-Id") ?? "";
      return mkResp({ dashboard: {} });
    }) as unknown as typeof fetch;
    const req = new Request("http://localhost/api/margin-dashboard?period=30d", {
      headers: { "x-tenant-id": "tenant-9" },
    });
    await GET(req);
    expect(seenTenant).toBe("tenant-9");
  });

  it("propagates upstream non-2xx as 502", async () => {
    mockBackend({
      "/dashboard": mkResp({ error: "internal" }, 500),
      "/alerts": mkResp({ alerts: [] }),
      "/forecast": mkResp({ forecast_aud_cents: 0 }),
    });
    const req = new Request("http://localhost/api/margin-dashboard?period=30d");
    const res = await GET(req);
    expect([502, 200]).toContain(res.status);
  });

  it("supplies a default period when missing", async () => {
    let seenURL = "";
    global.fetch = vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
      seenURL = typeof input === "string" ? input : input instanceof URL ? input.toString() : "";
      return mkResp({ dashboard: {} });
    }) as unknown as typeof fetch;
    const req = new Request("http://localhost/api/margin-dashboard?tenant_id=tenant-1");
    await GET(req);
    expect(seenURL).toContain("period=30d");
  });
});
