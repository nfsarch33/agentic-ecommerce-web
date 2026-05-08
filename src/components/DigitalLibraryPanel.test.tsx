import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { License } from "@/lib/domain/digital";
import { DigitalLibraryPanel } from "./DigitalLibraryPanel";

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

describe("DigitalLibraryPanel", () => {
  it("renders empty state when no licences exist", () => {
    render(<DigitalLibraryPanel licenses={[]} tenantId="tenant-a" baseUrl="http://api.test" />);
    expect(screen.getByTestId("digital-library-empty")).toBeVisible();
  });

  it("surfaces error in empty state", () => {
    render(
      <DigitalLibraryPanel
        licenses={[]}
        tenantId="tenant-a"
        baseUrl="http://api.test"
        error="offline"
      />,
    );
    expect(screen.getByTestId("digital-library-error")).toHaveTextContent("offline");
  });

  it("renders licences with the download button when usable", () => {
    render(
      <DigitalLibraryPanel
        licenses={[license()]}
        tenantId="tenant-a"
        baseUrl="http://api.test"
      />,
    );
    expect(screen.getByTestId("digital-library-row-lic-1")).toBeVisible();
    expect(screen.getByTestId("license-download-lic-1")).toBeVisible();
  });

  it("disables downloads for revoked licences", () => {
    render(
      <DigitalLibraryPanel
        licenses={[license("revoked")]}
        tenantId="tenant-a"
        baseUrl="http://api.test"
      />,
    );
    expect(screen.queryByTestId("license-download-lic-1")).toBeNull();
    expect(screen.getByText(/Download disabled/)).toBeVisible();
  });
});
