import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MembershipPlanManagement } from "./MembershipPlanManagement";
import type { MembershipPlan } from "@/lib/domain/membership";

const plans: readonly MembershipPlan[] = [
  {
    id: "plan-1",
    tenantId: "tenant-a",
    name: "Pro",
    description: "All-access",
    billingCycle: "monthly",
    price: { amount: 2900, currency: "AUD" },
    benefits: ["benefit a"],
    stripePriceId: "price_123",
    createdAt: "2026-05-08T07:30:00Z",
    updatedAt: "2026-05-08T07:30:00Z",
  },
];

describe("MembershipPlanManagement", () => {
  it("renders plans grid", () => {
    render(<MembershipPlanManagement initialPlans={plans} userRole="operator" />);
    expect(screen.getByTestId("membership-plans-grid")).toBeInTheDocument();
    expect(screen.getByTestId("membership-plan-plan-1")).toBeInTheDocument();
    expect(screen.getByText(/Operator access/)).toBeInTheDocument();
  });

  it("shows empty state when no plans", () => {
    render(<MembershipPlanManagement initialPlans={[]} userRole="operator" />);
    expect(screen.getByTestId("membership-plans-empty")).toBeInTheDocument();
  });

  it("renders view-only badge for viewer", () => {
    render(<MembershipPlanManagement initialPlans={plans} userRole="viewer" />);
    expect(screen.getByText(/View-only access/)).toBeInTheDocument();
  });
});
