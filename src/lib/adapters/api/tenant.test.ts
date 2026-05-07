import { describe, expect, it, vi } from "vitest";
import { fetchTenantSettings, TenantApiError, updateTenantSettings } from "./tenant";

function jsonResponse(body: unknown, init: ResponseInit = { status: 200 }): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    ...init,
  });
}

const rawSettings = {
  tenant_id: "tenant_default",
  display_name: "Demo Store",
  branding: {
    logo_url: "https://cdn.example/logo.svg",
    primary_color: "#2563eb",
    accent_color: "#10b981",
  },
  preferences: {
    default_locale: "en-AU",
    currency: "AUD",
    timezone: "Australia/Melbourne",
    ai_tone: "friendly",
    compliance_strict_mode: true,
    data_retention_days: 365,
  },
  updated_at: "2026-05-08T00:00:00Z",
};

describe("tenant API adapter", () => {
  it("fetches the active tenant settings contract", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ settings: rawSettings }));

    const settings = await fetchTenantSettings({ baseUrl: "http://api.test", fetchImpl: mockFetch });

    expect(settings.tenantId).toBe("tenant_default");
    expect(settings.branding.primaryColor).toBe("#2563eb");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/tenants/current/settings",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("patches tenant settings using the expected snake_case backend payload", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ settings: rawSettings }));

    await updateTenantSettings({
      baseUrl: "http://api.test",
      settings: {
        tenantId: "tenant_default",
        displayName: "Demo Store",
        branding: { logoUrl: "https://cdn.example/logo.svg", primaryColor: "#2563eb", accentColor: "#10b981" },
        preferences: {
          defaultLocale: "en-AU",
          currency: "AUD",
          timezone: "Australia/Melbourne",
          aiTone: "friendly",
          complianceStrictMode: true,
          dataRetentionDays: 365,
        },
        updatedAt: "2026-05-08T00:00:00Z",
      },
      fetchImpl: mockFetch,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/tenants/current/settings",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          display_name: "Demo Store",
          branding: {
            logo_url: "https://cdn.example/logo.svg",
            primary_color: "#2563eb",
            accent_color: "#10b981",
          },
          preferences: {
            default_locale: "en-AU",
            currency: "AUD",
            timezone: "Australia/Melbourne",
            ai_tone: "friendly",
            compliance_strict_mode: true,
            data_retention_days: 365,
          },
        }),
      }),
    );
  });

  it("wraps malformed and failed tenant responses", async () => {
    await expect(
      fetchTenantSettings({
        baseUrl: "http://api.test",
        fetchImpl: vi.fn().mockResolvedValue(jsonResponse({ settings: { tenant_id: "" } })),
      }),
    ).rejects.toBeInstanceOf(TenantApiError);

    await expect(
      fetchTenantSettings({
        baseUrl: "http://api.test",
        fetchImpl: vi.fn().mockResolvedValue(jsonResponse({ error: "boom" }, { status: 500 })),
      }),
    ).rejects.toMatchObject({ status: 500 });
  });

  it("accepts unwrapped camelCase settings from early backend builds", async () => {
    const settings = await fetchTenantSettings({
      baseUrl: "http://api.test",
      fetchImpl: vi.fn().mockResolvedValue(
        jsonResponse({
          tenantId: "tenant_default",
          displayName: "Demo Store",
          branding: { logoUrl: "", primaryColor: "#2563EB", accentColor: "#10B981" },
          preferences: {
            defaultLocale: "en-AU",
            currency: "AUD",
            timezone: "Australia/Melbourne",
            aiTone: "friendly",
            complianceStrictMode: false,
            dataRetentionDays: 30,
          },
          updatedAt: "2026-05-08T00:00:00Z",
        }),
      ),
    });

    expect(settings.branding.logoUrl).toBeUndefined();
    expect(settings.branding.primaryColor).toBe("#2563eb");
    expect(settings.preferences.complianceStrictMode).toBe(false);
  });

  it("wraps update HTTP and network failures", async () => {
    await expect(
      updateTenantSettings({
        baseUrl: "http://api.test",
        settings: {
          tenantId: "tenant_default",
          displayName: "Demo Store",
          branding: { primaryColor: "#2563eb", accentColor: "#10b981" },
          preferences: {
            defaultLocale: "en-AU",
            currency: "AUD",
            timezone: "Australia/Melbourne",
            aiTone: "friendly",
            complianceStrictMode: true,
            dataRetentionDays: 365,
          },
          updatedAt: "2026-05-08T00:00:00Z",
        },
        fetchImpl: vi.fn().mockResolvedValue(jsonResponse({ error: "boom" }, { status: 500 })),
      }),
    ).rejects.toMatchObject({ status: 500 });

    await expect(
      fetchTenantSettings({
        baseUrl: "http://api.test",
        fetchImpl: vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
      }),
    ).rejects.toBeInstanceOf(TenantApiError);
  });
});
