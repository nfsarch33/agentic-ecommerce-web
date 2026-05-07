import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

describe("GET /readyz", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns ok when required deployment configuration is valid", async () => {
    vi.stubEnv("MC_API_BASE_URL", "https://api.example.com");
    vi.stubEnv("NEXT_PUBLIC_APP_ORIGIN", "https://storefront.example.com");
    vi.stubEnv("NEXT_PUBLIC_MEDIA_CDN_BASE_URL", "https://cdn.example.com");

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({
      status: "ready",
      service: "agentic-ecommerce-web",
    });
  });

  it("returns service unavailable when deployment configuration is invalid", async () => {
    vi.stubEnv("MC_API_BASE_URL", "not-a-url");

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      status: "not_ready",
    });
  });
});
