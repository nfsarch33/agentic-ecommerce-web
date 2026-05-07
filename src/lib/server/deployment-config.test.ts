import { describe, expect, it } from "vitest";
import { deploymentReadiness, resolveAuthCookieConfig, resolveDeploymentConfig } from "./deployment-config";

describe("resolveDeploymentConfig", () => {
  it("normalizes production cloud URLs from environment variables", () => {
    const config = resolveDeploymentConfig({
      MC_API_BASE_URL: "https://api.example.com/",
      NEXT_PUBLIC_MC_API_BASE_URL: "https://api.example.com/",
      NEXT_PUBLIC_APP_ORIGIN: "https://storefront.example.com/",
      NEXT_PUBLIC_MEDIA_CDN_BASE_URL: "https://cdn.example.com/media/",
      NEXT_PUBLIC_N8N_URL: "https://n8n.example.com/",
      NEXT_PUBLIC_TEMPORAL_UI_URL: "https://temporal.example.com/",
    });

    expect(config.mcApiBaseUrl).toBe("https://api.example.com");
    expect(config.publicMcApiBaseUrl).toBe("https://api.example.com");
    expect(config.publicAppOrigin).toBe("https://storefront.example.com");
    expect(config.mediaCdnBaseUrl).toBe("https://cdn.example.com/media");
    expect(config.n8nUrl).toBe("https://n8n.example.com");
    expect(config.temporalUiUrl).toBe("https://temporal.example.com");
  });

  it("keeps NEXT_PUBLIC_SITE_URL as a backwards-compatible public origin fallback", () => {
    const config = resolveDeploymentConfig({
      MC_API_BASE_URL: "https://api.example.com",
      NEXT_PUBLIC_SITE_URL: "https://legacy-storefront.example.com",
    });

    expect(config.publicAppOrigin).toBe("https://legacy-storefront.example.com");
  });
});

describe("resolveAuthCookieConfig", () => {
  it("defaults secure cookies on in production", () => {
    expect(resolveAuthCookieConfig({ NODE_ENV: "production" })).toMatchObject({
      secure: true,
      sameSite: "lax",
    });
  });

  it("allows explicit secure, same-site, and domain settings", () => {
    expect(
      resolveAuthCookieConfig({
        AUTH_COOKIE_SECURE: "true",
        AUTH_COOKIE_SAME_SITE: "strict",
        AUTH_COOKIE_DOMAIN: ".example.com",
      }),
    ).toEqual({
      secure: true,
      sameSite: "strict",
      domain: ".example.com",
    });
  });

  it("forces secure cookies when SameSite=None is configured", () => {
    expect(
      resolveAuthCookieConfig({
        AUTH_COOKIE_SECURE: "false",
        AUTH_COOKIE_SAME_SITE: "none",
      }),
    ).toMatchObject({
      secure: true,
      sameSite: "none",
    });
  });
});

describe("deploymentReadiness", () => {
  it("passes for a production cloud configuration with optional service links", () => {
    const readiness = deploymentReadiness({
      NODE_ENV: "production",
      MC_API_BASE_URL: "https://api.example.com",
      NEXT_PUBLIC_MC_API_BASE_URL: "https://api.example.com",
      NEXT_PUBLIC_APP_ORIGIN: "https://storefront.example.com",
      NEXT_PUBLIC_MEDIA_CDN_BASE_URL: "https://cdn.example.com",
      NEXT_PUBLIC_N8N_URL: "https://n8n.example.com",
      NEXT_PUBLIC_TEMPORAL_UI_URL: "https://temporal.example.com",
    });

    expect(readiness.ready).toBe(true);
    expect(readiness.checks.every((check) => check.ok)).toBe(true);
  });

  it("fails production readiness without a public frontend origin", () => {
    const readiness = deploymentReadiness({
      NODE_ENV: "production",
      MC_API_BASE_URL: "https://api.example.com",
    });

    expect(readiness.ready).toBe(false);
    expect(readiness.checks).toContainEqual(
      expect.objectContaining({
        name: "NEXT_PUBLIC_APP_ORIGIN",
        ok: false,
      }),
    );
  });

  it("fails readiness when optional public URLs are malformed", () => {
    const readiness = deploymentReadiness({
      MC_API_BASE_URL: "https://api.example.com",
      NEXT_PUBLIC_MEDIA_CDN_BASE_URL: "cdn.example.com",
    });

    expect(readiness.ready).toBe(false);
    expect(readiness.checks).toContainEqual(
      expect.objectContaining({
        name: "NEXT_PUBLIC_MEDIA_CDN_BASE_URL",
        ok: false,
      }),
    );
  });

  it("fails production readiness when browser-facing URLs are not HTTPS", () => {
    const readiness = deploymentReadiness({
      NODE_ENV: "production",
      MC_API_BASE_URL: "http://internal-api.example.local",
      NEXT_PUBLIC_MC_API_BASE_URL: "http://api.example.com",
      NEXT_PUBLIC_APP_ORIGIN: "http://storefront.example.com",
      NEXT_PUBLIC_MEDIA_CDN_BASE_URL: "http://cdn.example.com",
    });

    expect(readiness.ready).toBe(false);
    expect(readiness.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "NEXT_PUBLIC_MC_API_BASE_URL",
          ok: false,
          detail: "must use HTTPS in production",
        }),
        expect.objectContaining({
          name: "NEXT_PUBLIC_APP_ORIGIN",
          ok: false,
          detail: "must use HTTPS in production",
        }),
        expect.objectContaining({
          name: "NEXT_PUBLIC_MEDIA_CDN_BASE_URL",
          ok: false,
          detail: "must use HTTPS in production",
        }),
      ]),
    );
  });

  it("allows a private server-side API URL when the browser API URL is HTTPS", () => {
    const readiness = deploymentReadiness({
      NODE_ENV: "production",
      MC_API_BASE_URL: "http://mc-api.internal:8080",
      NEXT_PUBLIC_MC_API_BASE_URL: "https://api.example.com",
      NEXT_PUBLIC_APP_ORIGIN: "https://storefront.example.com",
    });

    expect(readiness.ready).toBe(true);
  });
});
