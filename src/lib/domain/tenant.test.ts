import { describe, expect, it } from "vitest";
import {
  IllegalTenantTransitionError,
  allLegalTenantTransitions,
  canActivateTenant,
  canArchiveTenant,
  canSuspendTenant,
  createTenantSettings,
  isTenantStatus,
  isValidTenantSlug,
  nextTenantStatus,
  tenantDisplayLabel,
  tenantStatusLabel,
  tenantStatusTone,
  type TenantStatus,
  type TenantTransition,
} from "./tenant";

describe("TenantSettings (existing settings helpers)", () => {
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

describe("v2.4.0 tenant aggregate state machine", () => {
  it("encodes the same triples as the backend", () => {
    expect(allLegalTenantTransitions()).toEqual(
      expect.arrayContaining([
        { from: "provisioning", via: "activate", to: "active" },
        { from: "provisioning", via: "archive", to: "archived" },
        { from: "active", via: "suspend", to: "suspended" },
        { from: "active", via: "archive", to: "archived" },
        { from: "suspended", via: "activate", to: "active" },
        { from: "suspended", via: "archive", to: "archived" },
      ]),
    );
  });

  it("nextTenantStatus returns the destination for legal moves", () => {
    expect(nextTenantStatus("provisioning", "activate")).toBe("active");
    expect(nextTenantStatus("active", "suspend")).toBe("suspended");
    expect(nextTenantStatus("suspended", "activate")).toBe("active");
    expect(nextTenantStatus("active", "archive")).toBe("archived");
  });

  it.each<[TenantStatus, TenantTransition]>([
    ["provisioning", "suspend"],
    ["archived", "activate"],
    ["archived", "suspend"],
    ["archived", "archive"],
    ["active", "activate"],
  ])("rejects %s -> %s", (from, via) => {
    expect(() => nextTenantStatus(from, via)).toThrow(IllegalTenantTransitionError);
  });

  it("can* helpers correctly gate UI buttons", () => {
    expect(canActivateTenant("suspended")).toBe(true);
    expect(canSuspendTenant("active")).toBe(true);
    expect(canArchiveTenant("active")).toBe(true);
    expect(canActivateTenant("active")).toBe(false);
    expect(canSuspendTenant("provisioning")).toBe(false);
    expect(canArchiveTenant("archived")).toBe(false);
  });

  it("labels + tones cover every status", () => {
    for (const status of ["provisioning", "active", "suspended", "archived"] as const) {
      expect(tenantStatusLabel(status).length).toBeGreaterThan(0);
      expect(["neutral", "ok", "warn", "danger"]).toContain(tenantStatusTone(status));
    }
  });

  it("isTenantStatus narrows strings", () => {
    expect(isTenantStatus("active")).toBe(true);
    expect(isTenantStatus("ghost")).toBe(false);
  });

  it("isValidTenantSlug enforces kebab-case", () => {
    expect(isValidTenantSlug("acme")).toBe(true);
    expect(isValidTenantSlug("acme-corp")).toBe(true);
    expect(isValidTenantSlug("Acme")).toBe(false);
    expect(isValidTenantSlug("a")).toBe(false);
  });
});
