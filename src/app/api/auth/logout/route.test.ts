import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const originalBaseUrl = process.env.MC_API_BASE_URL;

afterEach(() => {
  process.env.MC_API_BASE_URL = originalBaseUrl;
  vi.restoreAllMocks();
});

describe("POST /api/auth/logout", () => {
  it("proxies logout to the backend and clears the secure cookie", async () => {
    process.env.MC_API_BASE_URL = "http://api.test";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    const response = await POST(
      new Request("http://web.test/api/auth/logout", {
        method: "POST",
        headers: { cookie: "ec_session=jwt-token" },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("ec_session=");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(fetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/auth/logout",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ authorization: "Bearer jwt-token" }),
      }),
    );
  });

  it("clears the cookie even when no backend token is available", async () => {
    const response = await POST(new Request("http://web.test/api/auth/logout", { method: "POST" }));
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
