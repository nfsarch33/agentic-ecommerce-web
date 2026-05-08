import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CustomerMembershipPanel } from "./CustomerMembershipPanel";
import type { MembershipPlan, Subscription } from "@/lib/domain/membership";

const plan: MembershipPlan = {
  id: "plan-1",
  tenantId: "tenant-a",
  name: "Pro",
  billingCycle: "monthly",
  price: { amount: 2900, currency: "AUD" },
  benefits: ["benefit a"],
  createdAt: "2026-05-08T07:30:00Z",
  updatedAt: "2026-05-08T07:30:00Z",
};

function sub(state: Subscription["state"]): Subscription {
  return {
    id: "sub-1",
    tenantId: "tenant-a",
    memberId: "mem-1",
    memberEmail: "alice@example.com",
    planId: "plan-1",
    state,
    currentPeriodStart: "2026-05-08T07:30:00Z",
    currentPeriodEnd: "2026-06-08T07:30:00Z",
    trialEndsAt: "2026-05-15T07:30:00Z",
    createdAt: "2026-05-08T07:30:00Z",
    updatedAt: "2026-05-08T07:30:00Z",
    plan,
  };
}

describe("CustomerMembershipPanel", () => {
  it("renders join flow when no membership", () => {
    render(
      <CustomerMembershipPanel plans={[plan]} tenantId="tenant-a" baseUrl="http://api.test" />,
    );
    expect(screen.getByText(/Join the membership/)).toBeInTheDocument();
    expect(screen.getByTestId("plan-selector")).toBeInTheDocument();
    expect(screen.getByTestId("customer-membership-checkout")).toBeInTheDocument();
  });

  it("renders existing membership with status pill and actions", () => {
    render(
      <CustomerMembershipPanel
        plans={[plan]}
        membership={sub("active")}
        tenantId="tenant-a"
        baseUrl="http://api.test"
      />,
    );
    expect(screen.getByText(/My membership/)).toBeInTheDocument();
    expect(screen.getByTestId("membership-status-active")).toBeInTheDocument();
    expect(screen.getByTestId("membership-action-pause")).toBeInTheDocument();
    expect(screen.getByTestId("membership-action-cancel")).toBeInTheDocument();
  });

  it("disables checkout until a plan is selected", () => {
    render(
      <CustomerMembershipPanel plans={[]} tenantId="tenant-a" baseUrl="http://api.test" />,
    );
    expect(screen.getByTestId("customer-membership-checkout")).toBeDisabled();
  });

  it("checkout button is enabled when a plan is selected", () => {
    render(
      <CustomerMembershipPanel plans={[plan]} tenantId="tenant-a" baseUrl="http://api.test" />,
    );
    // First plan is auto-selected.
    expect(screen.getByTestId("customer-membership-checkout")).toBeEnabled();
    // Click the radio explicitly to ensure the click handler runs.
    fireEvent.click(screen.getByLabelText(/Pro/));
    expect(screen.getByTestId("customer-membership-checkout")).toBeEnabled();
  });

  it("transitions active -> paused when pause action is clicked", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      if (u.endsWith("/pause")) {
        return new Response(
          JSON.stringify({
            id: "sub-1",
            tenant_id: "tenant-a",
            member_id: "mem-1",
            member_email: "alice@example.com",
            plan_id: "plan-1",
            state: "paused",
            current_period_start: "2026-05-08T07:30:00Z",
            current_period_end: "2026-06-08T07:30:00Z",
            trial_ends_at: "2026-05-15T07:30:00Z",
            created_at: "2026-05-08T07:30:00Z",
            updated_at: "2026-05-08T07:30:00Z",
            plan: {
              id: "plan-1",
              tenant_id: "tenant-a",
              name: "Pro",
              billing_cycle: "monthly",
              price: { amount: 2900, currency: "AUD" },
              benefits: [],
              created_at: "2026-05-08T07:30:00Z",
              updated_at: "2026-05-08T07:30:00Z",
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response("not stubbed", { status: 500 });
    });
    vi.stubGlobal("fetch", fetchImpl);
    try {
      render(
        <CustomerMembershipPanel
          plans={[plan]}
          membership={sub("active")}
          tenantId="tenant-a"
          baseUrl="http://api.test"
        />,
      );
      fireEvent.click(screen.getByTestId("membership-action-pause"));
      const { findByTestId } = screen;
      await findByTestId("membership-status-paused");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("surfaces error toast when transition rejects with 422", async () => {
    const fetchImpl = vi.fn(async () => new Response("err", { status: 422 }));
    vi.stubGlobal("fetch", fetchImpl);
    try {
      render(
        <CustomerMembershipPanel
          plans={[plan]}
          membership={sub("active")}
          tenantId="tenant-a"
          baseUrl="http://api.test"
        />,
      );
      fireEvent.click(screen.getByTestId("membership-action-cancel"));
      const errorEl = await screen.findByTestId("customer-membership-error");
      expect(errorEl.textContent).toMatch(/HTTP 422/);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
