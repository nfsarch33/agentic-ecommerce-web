import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TenantStatusPill } from "./TenantStatusPill";

describe("TenantStatusPill", () => {
  it("renders the status label and a stable test id", () => {
    render(<TenantStatusPill status="active" />);
    expect(screen.getByTestId("tenant-status-active")).toHaveTextContent("Active");
  });

  it("uses different tones per status", () => {
    const { rerender } = render(<TenantStatusPill status="provisioning" />);
    expect(screen.getByTestId("tenant-status-provisioning").className).toContain("slate");
    rerender(<TenantStatusPill status="active" />);
    expect(screen.getByTestId("tenant-status-active").className).toContain("emerald");
    rerender(<TenantStatusPill status="suspended" />);
    expect(screen.getByTestId("tenant-status-suspended").className).toContain("amber");
    rerender(<TenantStatusPill status="archived" />);
    expect(screen.getByTestId("tenant-status-archived").className).toContain("rose");
  });
});
