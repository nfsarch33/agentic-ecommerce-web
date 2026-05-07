import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TenantSelector } from "./TenantSelector";

describe("TenantSelector", () => {
  it("shows the active tenant and is ready for future multi-tenant switching", async () => {
    const user = userEvent.setup();
    const onTenantChange = vi.fn();

    render(
      <TenantSelector
        tenants={[
          { tenantId: "tenant_default", displayName: "Demo Store" },
          { tenantId: "tenant_secondary", displayName: "Outlet Store" },
        ]}
        activeTenantId="tenant_default"
        onTenantChange={onTenantChange}
      />,
    );

    const select = screen.getByLabelText(/active tenant/i);
    expect(select).toHaveValue("tenant_default");

    await user.selectOptions(select, "tenant_secondary");

    expect(onTenantChange).toHaveBeenCalledWith("tenant_secondary");
  });

  it("renders a disabled single-tenant selector when only one tenant is available", () => {
    render(
      <TenantSelector tenants={[{ tenantId: "tenant_default", displayName: "Demo Store" }]} activeTenantId="tenant_default" />,
    );

    expect(screen.getByLabelText(/active tenant/i)).toBeDisabled();
    expect(screen.getByText(/single tenant mode/i)).toBeInTheDocument();
  });
});
