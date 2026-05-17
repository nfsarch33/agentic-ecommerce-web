import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const REAL_FETCH = global.fetch;

afterEach(() => {
  global.fetch = REAL_FETCH;
});

function mkResp(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("operator alert mutation BFF routes", () => {
  it("ships a catch-all mutation route module", async () => {
    await expect(import("./[...path]/route")).resolves.toMatchObject({
      POST: expect.any(Function),
    });
  });

  it("forwards acknowledge mutations to the canonical backend operator-alert route", async () => {
    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      expect(url).toContain("/api/v1/operator/alerts/alert-1/acknowledge");
      expect(url).toContain("tenant_id=tenant-1");

      const headers = new Headers(init?.headers);
      expect(headers.get("X-Tenant-Id")).toBe("tenant-1");
      expect(headers.get("Cookie")).toBe("session=jwt");
      expect(init?.method).toBe("POST");

      return mkResp({ tenant_id: "tenant-1", alert_id: "alert-1", status: "acknowledged" });
    }) as unknown as typeof fetch;

    const { POST } = await import("./[...path]/route");
    const res = await POST(
      new Request("http://localhost/api/operator-alerts/alert-1/acknowledge?tenant_id=tenant-1", {
        method: "POST",
        headers: {
          "x-tenant-id": "tenant-1",
          cookie: "session=jwt",
        },
      }),
    );

    expect(res.status).toBe(200);
  });

  it("forwards resolve mutations to the canonical backend operator-alert route", async () => {
    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      expect(url).toContain("/api/v1/operator/alerts/alert-1/resolve");
      expect(url).toContain("tenant_id=tenant-1");
      expect(url).toContain("action=deny");

      const headers = new Headers(init?.headers);
      expect(headers.get("X-Tenant-Id")).toBe("tenant-1");
      expect(headers.get("Cookie")).toBe("session=jwt");
      expect(init?.method).toBe("POST");

      return mkResp({
        tenant_id: "tenant-1",
        alert_id: "alert-1",
        status: "resolved",
        action_taken: "deny",
      });
    }) as unknown as typeof fetch;

    const { POST } = await import("./[...path]/route");
    const res = await POST(
      new Request("http://localhost/api/operator-alerts/alert-1/resolve?tenant_id=tenant-1&action=deny", {
        method: "POST",
        headers: {
          "x-tenant-id": "tenant-1",
          cookie: "session=jwt",
        },
      }),
    );

    expect(res.status).toBe(200);
  });

  it("documents the approved operator-alert and agent-activity BFF exceptions", () => {
    const docs = readFileSync(resolve(process.cwd(), "docs/bff-routes.md"), "utf8");
    expect(docs).toContain("/api/operator-alerts");
    expect(docs).toContain("/api/agent-activity/stream");
  });

  it("rejects unapproved operator-alert mutation tails instead of proxying them upstream", async () => {
    global.fetch = vi.fn(async () => {
      throw new Error("unexpected upstream call");
    }) as unknown as typeof fetch;

    const { POST } = await import("./[...path]/route");
    const res = await POST(
      new Request("http://localhost/api/operator-alerts/alert-1/unapproved?tenant_id=tenant-1", {
        method: "POST",
        headers: {
          "x-tenant-id": "tenant-1",
          cookie: "session=jwt",
        },
      }),
    );

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({ error: "unknown_route" });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
