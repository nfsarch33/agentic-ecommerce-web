import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LicenseKeyDisplay } from "./LicenseKeyDisplay";

describe("LicenseKeyDisplay", () => {
  it("renders the key and copies to clipboard on click", async () => {
    const writeText = vi.fn(async () => {});
    render(<LicenseKeyDisplay licenseKey="AAAAA-BBBBB" clipboard={{ writeText }} />);
    expect(screen.getByTestId("license-key")).toHaveTextContent("AAAAA-BBBBB");
    await userEvent.click(screen.getByTestId("license-key-copy"));
    expect(writeText).toHaveBeenCalledWith("AAAAA-BBBBB");
    await waitFor(() => {
      expect(screen.getByTestId("license-key-copy")).toHaveTextContent("Copied");
    });
  });

  it("keeps the copy button render-stable when clipboard is unavailable", async () => {
    render(<LicenseKeyDisplay licenseKey="AAAAA" clipboard={undefined as unknown as { writeText: (t: string) => Promise<void> }} />);
    expect(screen.getByTestId("license-key")).toHaveTextContent("AAAAA");
    await userEvent.click(screen.getByTestId("license-key-copy"));
    expect(screen.getByTestId("license-key-copy")).toHaveTextContent("Copy");
  });

  it("recovers when the clipboard write rejects", async () => {
    const writeText = vi.fn(async () => {
      throw new Error("nope");
    });
    render(<LicenseKeyDisplay licenseKey="X" clipboard={{ writeText }} />);
    await userEvent.click(screen.getByTestId("license-key-copy"));
    expect(screen.getByTestId("license-key-copy")).toHaveTextContent("Copy");
  });
});
