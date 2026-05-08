import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PlanSelector } from "./PlanSelector";
import type { MembershipPlan } from "@/lib/domain/membership";

const plans: readonly MembershipPlan[] = [
  {
    id: "plan-monthly",
    tenantId: "tenant-a",
    name: "Pro Monthly",
    description: "Monthly plan",
    billingCycle: "monthly",
    price: { amount: 2900, currency: "AUD" },
    benefits: ["benefit a"],
    createdAt: "2026-05-08T07:30:00Z",
    updatedAt: "2026-05-08T07:30:00Z",
  },
  {
    id: "plan-annual",
    tenantId: "tenant-a",
    name: "Pro Annual",
    billingCycle: "annual",
    price: { amount: 29900, currency: "AUD" },
    benefits: [],
    createdAt: "2026-05-08T07:30:00Z",
    updatedAt: "2026-05-08T07:30:00Z",
  },
];

describe("PlanSelector", () => {
  it("renders empty state when no plans", () => {
    render(<PlanSelector plans={[]} onSelect={() => undefined} />);
    expect(screen.getByTestId("plan-selector-empty")).toBeInTheDocument();
  });

  it("lists every plan", () => {
    render(<PlanSelector plans={plans} onSelect={() => undefined} />);
    expect(screen.getByTestId("plan-option-plan-monthly")).toBeInTheDocument();
    expect(screen.getByTestId("plan-option-plan-annual")).toBeInTheDocument();
  });

  it("checks the selected plan", () => {
    render(<PlanSelector plans={plans} selectedPlanId="plan-annual" onSelect={() => undefined} />);
    const annualInput = screen.getByLabelText(/Pro Annual/) as HTMLInputElement;
    expect(annualInput.checked).toBe(true);
  });

  it("invokes onSelect when changing plan", () => {
    const onSelect = vi.fn();
    render(<PlanSelector plans={plans} onSelect={onSelect} />);
    fireEvent.click(screen.getByLabelText(/Pro Monthly/));
    expect(onSelect).toHaveBeenCalledWith("plan-monthly");
  });

  it("renders billing cadence suffix and currency", () => {
    render(<PlanSelector plans={plans} onSelect={() => undefined} />);
    expect(screen.getByText(/A\$29\.00 \/ mo/)).toBeInTheDocument();
    expect(screen.getByText(/A\$299\.00 \/ yr/)).toBeInTheDocument();
  });
});
