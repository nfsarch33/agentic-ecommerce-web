import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TenantSettingsPage from "./page";

vi.mock("@/lib/server/auth-session", () => ({
  requireServerSession: vi.fn(),
}));

vi.mock("@/lib/usecases/tenant-settings", () => ({
  loadTenantSettings: vi.fn(),
}));

vi.mock("@/components/TenantSettingsPanel", () => ({
  TenantSettingsPanel: ({ settings }: { settings: { displayName: string; tenantId: string } }) => (
    <div>
      <h1>Tenant Settings</h1>
      <p>{settings.displayName}</p>
      <p>{settings.tenantId}</p>
    </div>
  ),
}));

import { requireServerSession } from "@/lib/server/auth-session";
import { loadTenantSettings } from "@/lib/usecases/tenant-settings";

const mockRequireServerSession = vi.mocked(requireServerSession);
const mockLoadTenantSettings = vi.mocked(loadTenantSettings);

describe("Tenant settings page", () => {
  it("requires an admin and renders active tenant settings", async () => {
    mockRequireServerSession.mockResolvedValue({
      user: { id: "u_1", email: "admin@example.com", role: "admin" },
      expiresAt: "2026-05-08T10:00:00Z",
    });
    mockLoadTenantSettings.mockResolvedValue({
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
    });

    render(await TenantSettingsPage());

    expect(mockRequireServerSession).toHaveBeenCalledWith("admin");
    expect(mockLoadTenantSettings).toHaveBeenCalledWith({ baseUrl: "http://localhost:8080" });
    expect(screen.getByRole("heading", { name: /tenant settings/i })).toBeInTheDocument();
    expect(screen.getByText("Demo Store")).toBeInTheDocument();
  });
});
