import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { TenantSettings } from "@/lib/domain/tenant";
import { TenantSettingsPanel } from "./TenantSettingsPanel";

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

describe("TenantSettingsPanel", () => {
  it("renders editable branding and preference controls", () => {
    render(<TenantSettingsPanel apiBaseUrl="http://api.test" settings={settings} updateTenantSettingsImpl={vi.fn()} />);

    expect(screen.getByRole("heading", { name: /tenant settings/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/display name/i)).toHaveValue("Demo Store");
    expect(screen.getByLabelText(/primary color/i)).toHaveValue("#2563eb");
    expect(screen.getByLabelText(/currency/i)).toHaveValue("AUD");
    expect(screen.getByLabelText(/strict compliance mode/i)).toBeChecked();
  });

  it("saves edited settings without exposing credentials", async () => {
    const user = userEvent.setup();
    const updateTenantSettingsImpl = vi.fn().mockResolvedValue({
      ...settings,
      displayName: "Demo Outlet",
      preferences: { ...settings.preferences, complianceStrictMode: false },
    });

    render(
      <TenantSettingsPanel
        apiBaseUrl="http://api.test"
        settings={settings}
        updateTenantSettingsImpl={updateTenantSettingsImpl}
      />,
    );

    await user.clear(screen.getByLabelText(/display name/i));
    await user.type(screen.getByLabelText(/display name/i), "Demo Outlet");
    await user.click(screen.getByLabelText(/strict compliance mode/i));
    await user.click(screen.getByRole("button", { name: /save tenant settings/i }));

    expect(updateTenantSettingsImpl).toHaveBeenCalledWith({
      baseUrl: "http://api.test",
      settings: expect.objectContaining({
        tenantId: "tenant_default",
        displayName: "Demo Outlet",
        preferences: expect.objectContaining({ complianceStrictMode: false }),
      }),
    });
    expect(await screen.findByRole("status")).toHaveTextContent(/tenant settings saved/i);
    expect(screen.queryByText(/woocommerce secret/i)).not.toBeInTheDocument();
  });

  it("surfaces save failures without clearing the edited draft", async () => {
    const user = userEvent.setup();
    const updateTenantSettingsImpl = vi.fn().mockRejectedValue(new Error("tenant API unavailable"));

    render(
      <TenantSettingsPanel
        apiBaseUrl="http://api.test"
        settings={settings}
        updateTenantSettingsImpl={updateTenantSettingsImpl}
      />,
    );

    await user.clear(screen.getByLabelText(/ai tone/i));
    await user.type(screen.getByLabelText(/ai tone/i), "premium");
    await user.click(screen.getByRole("button", { name: /save tenant settings/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("tenant API unavailable");
    expect(screen.getByLabelText(/ai tone/i)).toHaveValue("premium");
  });
});
