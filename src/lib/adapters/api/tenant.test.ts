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
  branding: {
    store_name: "Demo Store",
    logo_url: "https://cdn.example/logo.svg",
    primary_color: "#2563eb",
    accent_color: "#10b981",
  },
  woocommerce: {},
  ai: {
    content_tone: "friendly",
    model_tier: "fast",
    auto_generate_seo: true,
    fact_check_required: true,
  },
  compliance: { seo_score_min: 80 },
  updated_at: "2026-05-08T00:00:00Z",
};

describe("tenant API adapter", () => {
  it("fetches the active tenant settings contract", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ settings: rawSettings }));

    const settings = await fetchTenantSettings({
      baseUrl: "http://api.test",
      fetchImpl: mockFetch,
    });

    expect(settings.tenantId).toBe("tenant_default");
    expect(settings.branding.primaryColor).toBe("#2563eb");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/tenant/settings",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ "X-Tenant-ID": "tenant_default" }),
      }),
    );
  });

  it("puts tenant settings using the expected backend payload", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ settings: rawSettings }));

    await updateTenantSettings({
      baseUrl: "http://api.test",
      settings: {
        tenantId: "tenant_default",
        displayName: "Demo Store",
        branding: {
          logoUrl: "https://cdn.example/logo.svg",
          primaryColor: "#2563eb",
          accentColor: "#10b981",
        },
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
      "http://api.test/api/v1/tenant/settings",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({ "X-Tenant-ID": "tenant_default" }),
        body: JSON.stringify({
          branding: {
            store_name: "Demo Store",
            logo_url: "https://cdn.example/logo.svg",
            primary_color: "#2563eb",
            accent_color: "#10b981",
          },
          ai: {
            content_tone: "friendly",
            model_tier: "fast",
            auto_generate_seo: true,
            fact_check_required: true,
          },
          compliance: {
            seo_score_min: 80,
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

  it("uses an explicit tenant header and defaults optional backend settings", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      jsonResponse({
        tenant_id: "tenant_a",
        branding: { store_name: "Tenant A" },
        woocommerce: {},
        ai: { content_tone: "formal" },
        compliance: {},
        updated_at: "2026-05-08T00:00:00Z",
      }),
    );

    const settings = await fetchTenantSettings({
      baseUrl: "http://api.test",
      tenantId: "tenant_a",
      fetchImpl: mockFetch,
    });

    expect(settings.displayName).toBe("Tenant A");
    expect(settings.branding.accentColor).toBe(settings.branding.primaryColor);
    expect(settings.preferences.dataRetentionDays).toBe(365);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/tenant/settings",
      expect.objectContaining({ headers: expect.objectContaining({ "X-Tenant-ID": "tenant_a" }) }),
    );
  });
});
