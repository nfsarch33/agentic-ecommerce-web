import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MembershipActionsClient } from "./MembershipDetailClient";
import type { Subscription } from "@/lib/domain/membership";

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
    plan: {
      id: "plan-1",
      tenantId: "tenant-a",
      name: "Pro",
      billingCycle: "monthly",
      price: { amount: 2900, currency: "AUD" },
      benefits: [],
      createdAt: "2026-05-08T07:30:00Z",
      updatedAt: "2026-05-08T07:30:00Z",
    },
  };
}

describe("MembershipActionsClient", () => {
  it("renders viewer-locked message for viewer role", () => {
    render(
      <MembershipActionsClient
        initialMembership={sub("active")}
        tenantId="tenant-a"
        baseUrl="http://api.test"
        userRole="viewer"
      />,
    );
    expect(screen.getByText(/Operator access is required/)).toBeInTheDocument();
    expect(screen.queryByTestId("membership-action-pause")).not.toBeInTheDocument();
  });

  it("renders state pill + actions for operator", () => {
    render(
      <MembershipActionsClient
        initialMembership={sub("paused")}
        tenantId="tenant-a"
        baseUrl="http://api.test"
        userRole="operator"
      />,
    );
    expect(screen.getByTestId("membership-status-paused")).toBeInTheDocument();
    expect(screen.getByTestId("membership-action-resume")).toBeInTheDocument();
  });

  it("transitions paused -> active on resume", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          id: "sub-1",
          tenant_id: "tenant-a",
          member_id: "mem-1",
          member_email: "alice@example.com",
          plan_id: "plan-1",
          state: "active",
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
      ),
    );
    vi.stubGlobal("fetch", fetchImpl);
    try {
      render(
        <MembershipActionsClient
          initialMembership={sub("paused")}
          tenantId="tenant-a"
          baseUrl="http://api.test"
          userRole="operator"
        />,
      );
      fireEvent.click(screen.getByTestId("membership-action-resume"));
      const pill = await screen.findByTestId("membership-status-active");
      expect(pill).toBeInTheDocument();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("surfaces error on transition failure", async () => {
    const fetchImpl = vi.fn(async () => new Response("err", { status: 500 }));
    vi.stubGlobal("fetch", fetchImpl);
    try {
      render(
        <MembershipActionsClient
          initialMembership={sub("active")}
          tenantId="tenant-a"
          baseUrl="http://api.test"
          userRole="operator"
        />,
      );
      fireEvent.click(screen.getByTestId("membership-action-pause"));
      const err = await screen.findByTestId("membership-detail-error");
      expect(err.textContent).toMatch(/HTTP 500/);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
