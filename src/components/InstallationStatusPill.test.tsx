import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { InstallationStatusPill } from "./InstallationStatusPill";

describe("InstallationStatusPill", () => {
  it("renders the state label and a stable test id", () => {
    render(<InstallationStatusPill state="active" />);
    expect(screen.getByTestId("installation-status-active")).toHaveTextContent("Active");
  });

  it("uses different tones per state", () => {
    const { rerender } = render(<InstallationStatusPill state="active" />);
    expect(screen.getByTestId("installation-status-active").className).toContain("emerald");
    rerender(<InstallationStatusPill state="deactivated" />);
    expect(screen.getByTestId("installation-status-deactivated").className).toContain("amber");
    rerender(<InstallationStatusPill state="uninstalled" />);
    expect(screen.getByTestId("installation-status-uninstalled").className).toContain("rose");
    rerender(<InstallationStatusPill state="installed" />);
    expect(screen.getByTestId("installation-status-installed").className).toContain("slate");
  });
});
