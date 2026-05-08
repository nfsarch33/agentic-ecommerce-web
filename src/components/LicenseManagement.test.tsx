import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { License } from "@/lib/domain/digital";
import { LicenseManagement } from "./LicenseManagement";

function license(state: License["state"] = "active"): License {
  return {
    id: "lic-1",
    tenantId: "tenant-a",
    productId: "prod-1",
    customerId: "cust-1",
    key: "AAAAA-BBBBB-CCCCC-DDDDD-EEEEEEEE",
    state,
    issuedAt: "2026-05-08T12:00:00Z",
    maxActivations: 1,
    updatedAt: "2026-05-08T12:00:00Z",
  };
}

describe("LicenseManagement", () => {
  it("renders empty state with optional error", () => {
    render(
      <LicenseManagement
        initialLicenses={[]}
        userRole="operator"
        tenantId="tenant-a"
        baseUrl="http://api.test"
        error="boom"
      />,
    );
    expect(screen.getByTestId("licenses-empty")).toBeVisible();
    expect(screen.getByTestId("licenses-error")).toHaveTextContent("boom");
  });

  it("transitions an active licence to revoked optimistically", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          id: "lic-1",
          tenant_id: "tenant-a",
          product_id: "prod-1",
          customer_id: "cust-1",
          key: "AAAAA-BBBBB-CCCCC-DDDDD-EEEEEEEE",
          state: "revoked",
          issued_at: "2026-05-08T12:00:00Z",
          max_activations: 1,
          updated_at: "2026-05-08T12:00:00Z",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchImpl);
    try {
      render(
        <LicenseManagement
          initialLicenses={[license()]}
          userRole="operator"
          tenantId="tenant-a"
          baseUrl="http://api.test"
        />,
      );
      fireEvent.click(screen.getByTestId("license-action-revoke-lic-1"));
      await waitFor(() => {
        expect(screen.getByTestId("license-status-revoked")).toBeVisible();
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("hides the revoke button when state is terminal", () => {
    render(
      <LicenseManagement
        initialLicenses={[license("revoked")]}
        userRole="operator"
        tenantId="tenant-a"
        baseUrl="http://api.test"
      />,
    );
    expect(screen.queryByTestId("license-action-revoke-lic-1")).toBeNull();
  });

  it("hides the revoke button for viewer role", () => {
    render(
      <LicenseManagement
        initialLicenses={[license()]}
        userRole="viewer"
        tenantId="tenant-a"
        baseUrl="http://api.test"
      />,
    );
    expect(screen.queryByTestId("license-action-revoke-lic-1")).toBeNull();
  });

  it("surfaces a 422 error when revoke is rejected by the server", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 422 }));
    vi.stubGlobal("fetch", fetchImpl);
    try {
      render(
        <LicenseManagement
          initialLicenses={[license()]}
          userRole="operator"
          tenantId="tenant-a"
          baseUrl="http://api.test"
        />,
      );
      fireEvent.click(screen.getByTestId("license-action-revoke-lic-1"));
      await waitFor(() => {
        expect(screen.getByTestId("licenses-action-error").textContent).toMatch(/HTTP 422/);
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
