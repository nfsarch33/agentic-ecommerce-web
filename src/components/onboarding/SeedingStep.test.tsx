// File scope: v3.9.1 Existing #10 SeedingStep tests.
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SeedingStep } from "./SeedingStep";

describe("SeedingStep", () => {
  it("submits the configured source + count", () => {
    const onSubmit = vi.fn();
    render(<SeedingStep onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId("onboarding-seeding-source"), { target: { value: "taobao" } });
    fireEvent.change(screen.getByTestId("onboarding-seeding-count"), { target: { value: "50" } });
    fireEvent.click(screen.getByTestId("onboarding-seeding-submit"));
    expect(onSubmit).toHaveBeenCalledWith({ source: "taobao", itemCount: 50 });
  });

  it("clamps zero item count and still allows submit", () => {
    const onSubmit = vi.fn();
    render(<SeedingStep onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId("onboarding-seeding-count"), { target: { value: "0" } });
    fireEvent.click(screen.getByTestId("onboarding-seeding-submit"));
    expect(onSubmit).toHaveBeenCalledWith({ source: "1688", itemCount: 0 });
  });

  it("renders initial values when initial prop is provided", () => {
    const onSubmit = vi.fn();
    render(<SeedingStep onSubmit={onSubmit} initial={{ source: "woocommerce", itemCount: 12 }} />);
    const sourceSelect = screen.getByTestId("onboarding-seeding-source") as HTMLSelectElement;
    expect(sourceSelect.value).toBe("woocommerce");
    const countInput = screen.getByTestId("onboarding-seeding-count") as HTMLInputElement;
    expect(countInput.value).toBe("12");
  });
});
