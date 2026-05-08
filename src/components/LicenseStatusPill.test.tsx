import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LicenseStatusPill } from "./LicenseStatusPill";

describe("LicenseStatusPill", () => {
  it("renders the state label and a stable test id", () => {
    render(<LicenseStatusPill state="active" />);
    expect(screen.getByTestId("license-status-active")).toHaveTextContent("Active");
  });

  it("uses different tones per state", () => {
    const { rerender } = render(<LicenseStatusPill state="revoked" />);
    expect(screen.getByTestId("license-status-revoked").className).toContain("rose");
    rerender(<LicenseStatusPill state="expired" />);
    expect(screen.getByTestId("license-status-expired").className).toContain("amber");
  });
});
