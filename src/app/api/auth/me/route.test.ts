import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const originalBaseUrl = process.env.MC_API_BASE_URL;

afterEach(() => {
  process.env.MC_API_BASE_URL = originalBaseUrl;
  vi.restoreAllMocks();
});

describe("GET /api/auth/me", () => {
  it("returns the current session from the secure cookie token", async () => {
    process.env.MC_API_BASE_URL = "http://api.test";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            user: { id: "u_1", email: "operator@example.com", role: "operator" },
            expires_at: "2026-05-07T10:00:00Z",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const response = await GET(
      new Request("http://web.test/api/auth/me", {
        headers: { cookie: "ec_session=jwt-token" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      session: {
        user: { id: "u_1", email: "operator@example.com", role: "operator" },
        expiresAt: "2026-05-07T10:00:00Z",
      },
    });
    expect(fetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/auth/me",
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: "Bearer jwt-token" }),
      }),
    );
  });

  it("returns 401 when no session cookie is present", async () => {
    const response = await GET(new Request("http://web.test/api/auth/me"));
    expect(response.status).toBe(401);
  });
});
