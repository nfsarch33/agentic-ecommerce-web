import { describe, expect, it, vi } from "vitest";
import type { TenantSettings } from "@/lib/domain/tenant";
import { loadTenantSettings, saveTenantSettings } from "./tenant-settings";

const settings: TenantSettings = {
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
};

describe("tenant settings usecases", () => {
  it("loads active tenant settings from the adapter", async () => {
    const fetchTenantSettingsImpl = vi.fn().mockResolvedValue(settings);

    const result = await loadTenantSettings({ baseUrl: "http://api.test" }, { fetchTenantSettingsImpl });

    expect(result).toEqual(settings);
    expect(fetchTenantSettingsImpl).toHaveBeenCalledWith({ baseUrl: "http://api.test" });
  });

  it("trims editable settings before saving", async () => {
    const updateTenantSettingsImpl = vi.fn().mockResolvedValue(settings);

    await saveTenantSettings(
      {
        baseUrl: "http://api.test",
        settings: {
          ...settings,
          displayName: " Demo Store ",
          preferences: { ...settings.preferences, currency: " aud " },
        },
      },
      { updateTenantSettingsImpl },
    );

    expect(updateTenantSettingsImpl).toHaveBeenCalledWith({
      baseUrl: "http://api.test",
      settings: expect.objectContaining({
        displayName: "Demo Store",
        preferences: expect.objectContaining({ currency: "AUD" }),
      }),
    });
  });
});
