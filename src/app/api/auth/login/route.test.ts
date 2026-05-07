import { describe, expect, it, vi, afterEach } from "vitest";
import { POST } from "./route";

const originalBaseUrl = process.env.MC_API_BASE_URL;

afterEach(() => {
  process.env.MC_API_BASE_URL = originalBaseUrl;
  vi.restoreAllMocks();
});

describe("POST /api/auth/login", () => {
  it("proxies credentials to the backend, sets an httpOnly cookie, and omits the JWT from JSON", async () => {
    process.env.MC_API_BASE_URL = "http://api.test";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            access_token: "jwt-token",
            session: {
              user: { id: "u_1", email: "admin@example.com", role: "admin" },
              expires_at: "2026-05-07T10:00:00Z",
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const response = await POST(
      new Request("http://web.test/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "admin@example.com", password: "secret" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      session: {
        user: { id: "u_1", email: "admin@example.com", role: "admin" },
        expiresAt: "2026-05-07T10:00:00Z",
      },
    });
    expect(response.headers.get("set-cookie")).toContain("ec_session=jwt-token");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("SameSite=lax");
  });

  it("rejects invalid credential payloads before contacting the backend", async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    const response = await POST(
      new Request("http://web.test/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "bad", password: "" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
