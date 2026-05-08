import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OnboardingPlanSelector } from "./OnboardingPlanSelector";

describe("OnboardingPlanSelector", () => {
  it("renders all plans", () => {
    render(<OnboardingPlanSelector value="free" onChange={() => {}} />);
    expect(screen.getByTestId("plan-option-free")).toBeInTheDocument();
    expect(screen.getByTestId("plan-option-starter")).toBeInTheDocument();
    expect(screen.getByTestId("plan-option-pro")).toBeInTheDocument();
  });

  it("invokes onChange", () => {
    const onChange = vi.fn();
    render(<OnboardingPlanSelector value="free" onChange={onChange} />);
    fireEvent.click(screen.getByTestId("plan-option-starter").querySelector("input")!);
    expect(onChange).toHaveBeenCalledWith("starter");
  });
});
