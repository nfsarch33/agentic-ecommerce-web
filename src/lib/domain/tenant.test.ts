import { describe, expect, it } from "vitest";
import { createTenantSettings, tenantDisplayLabel } from "./tenant";

describe("TenantSettings", () => {
  it("normalizes branding and preference settings for the active tenant", () => {
    const settings = createTenantSettings({
      tenantId: " tenant_default ",
      displayName: " Demo Store ",
      branding: {
        logoUrl: " https://cdn.example/logo.svg ",
        primaryColor: "#2563eb",
        accentColor: "#10b981",
      },
      preferences: {
        defaultLocale: " en-AU ",
        currency: " aud ",
        timezone: " Australia/Melbourne ",
        aiTone: " friendly ",
        complianceStrictMode: true,
        dataRetentionDays: 365,
      },
      updatedAt: "2026-05-08T00:00:00Z",
    });

    expect(settings.tenantId).toBe("tenant_default");
    expect(settings.displayName).toBe("Demo Store");
    expect(settings.branding.logoUrl).toBe("https://cdn.example/logo.svg");
    expect(settings.preferences.currency).toBe("AUD");
    expect(settings.preferences.defaultLocale).toBe("en-AU");
    expect(tenantDisplayLabel(settings)).toBe("Demo Store (tenant_default)");
  });

  it("rejects invalid tenant settings before they reach the API", () => {
    expect(() =>
      createTenantSettings({
        tenantId: "",
        displayName: "Demo Store",
        branding: { primaryColor: "blue", accentColor: "#10b981" },
        preferences: {
          defaultLocale: "en-AU",
          currency: "AUD",
          timezone: "Australia/Melbourne",
          aiTone: "friendly",
          complianceStrictMode: false,
          dataRetentionDays: 0,
        },
        updatedAt: "2026-05-08T00:00:00Z",
      }),
    ).toThrow(/tenantId/);
  });
});
