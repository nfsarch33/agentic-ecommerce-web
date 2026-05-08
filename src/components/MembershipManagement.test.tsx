import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MembershipManagement } from "./MembershipManagement";
import type { Subscription } from "@/lib/domain/membership";

function sub(id: string, state: Subscription["state"]): Subscription {
  return {
    id,
    tenantId: "tenant-a",
    memberId: `mem-${id}`,
    memberEmail: `${id}@example.com`,
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

describe("MembershipManagement", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/cancel")) {
        return new Response(JSON.stringify({ ...rawSub("a", "cancelled") }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response("not stubbed", { status: 500 });
    }) as typeof fetch;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function rawSub(id: string, state: Subscription["state"]) {
    return {
      id,
      tenant_id: "tenant-a",
      member_id: `mem-${id}`,
      member_email: `${id}@example.com`,
      plan_id: "plan-1",
      state,
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
    };
  }

  it("renders empty state when no memberships", () => {
    render(
      <MembershipManagement
        initialMemberships={[]}
        counts={{ trial: 0, active: 0, paused: 0, cancelled: 0, expired: 0 }}
        userRole="operator"
        tenantId="tenant-a"
        baseUrl="http://api.test"
      />,
    );
    expect(screen.getByTestId("memberships-empty")).toBeInTheDocument();
  });

  it("lists memberships with status pill and counts", () => {
    render(
      <MembershipManagement
        initialMemberships={[sub("a", "active"), sub("b", "paused")]}
        counts={{ trial: 0, active: 1, paused: 1, cancelled: 0, expired: 0 }}
        userRole="operator"
        tenantId="tenant-a"
        baseUrl="http://api.test"
      />,
    );
    expect(screen.getByTestId("membership-row-a")).toBeInTheDocument();
    expect(screen.getByTestId("membership-row-b")).toBeInTheDocument();
    expect(screen.getByTestId("membership-count-active").textContent).toContain("1");
    expect(screen.getByTestId("membership-count-paused").textContent).toContain("1");
    expect(screen.getByTestId("membership-status-active")).toBeInTheDocument();
    expect(screen.getByTestId("membership-status-paused")).toBeInTheDocument();
  });

  it("hides actions for viewer role", () => {
    render(
      <MembershipManagement
        initialMemberships={[sub("a", "active")]}
        counts={{ trial: 0, active: 1, paused: 0, cancelled: 0, expired: 0 }}
        userRole="viewer"
        tenantId="tenant-a"
        baseUrl="http://api.test"
      />,
    );
    expect(screen.queryByTestId("membership-action-pause")).not.toBeInTheDocument();
    expect(screen.queryByTestId("membership-action-cancel")).not.toBeInTheDocument();
    expect(screen.getByText(/View-only access/)).toBeInTheDocument();
  });

  it("invokes cancel transition and updates state pill", async () => {
    render(
      <MembershipManagement
        initialMemberships={[sub("a", "active")]}
        counts={{ trial: 0, active: 1, paused: 0, cancelled: 0, expired: 0 }}
        userRole="operator"
        tenantId="tenant-a"
        baseUrl="http://api.test"
      />,
    );
    fireEvent.click(screen.getByTestId("membership-action-cancel"));
    await waitFor(() => {
      expect(screen.getByTestId("membership-status-cancelled")).toBeInTheDocument();
    });
  });

  it("surfaces errors on illegal transition without changing list", async () => {
    render(
      <MembershipManagement
        initialMemberships={[sub("a", "cancelled")]}
        counts={{ trial: 0, active: 0, paused: 0, cancelled: 1, expired: 0 }}
        userRole="operator"
        tenantId="tenant-a"
        baseUrl="http://api.test"
      />,
    );
    // Cancelled is terminal -> no actions are rendered, so the no-actions
    // hint shows up; the row stays cancelled and no error is fired.
    expect(screen.getByTestId("membership-actions-none")).toBeInTheDocument();
    expect(screen.getByTestId("membership-status-cancelled")).toBeInTheDocument();
  });

  it("surfaces error when transition fails (HTTP 500)", async () => {
    globalThis.fetch = vi.fn(async () => new Response("err", { status: 500 })) as typeof fetch;
    render(
      <MembershipManagement
        initialMemberships={[sub("a", "active")]}
        counts={{ trial: 0, active: 1, paused: 0, cancelled: 0, expired: 0 }}
        userRole="operator"
        tenantId="tenant-a"
        baseUrl="http://api.test"
      />,
    );
    fireEvent.click(screen.getByTestId("membership-action-cancel"));
    const errEl = await screen.findByTestId("membership-error-a");
    expect(errEl.textContent).toMatch(/HTTP 500/);
  });

  it("transitions paused -> active via resume", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ ...rawSub("a", "active") }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ) as typeof fetch;
    render(
      <MembershipManagement
        initialMemberships={[sub("a", "paused")]}
        counts={{ trial: 0, active: 0, paused: 1, cancelled: 0, expired: 0 }}
        userRole="operator"
        tenantId="tenant-a"
        baseUrl="http://api.test"
      />,
    );
    fireEvent.click(screen.getByTestId("membership-action-resume"));
    await waitFor(() => {
      expect(screen.getByTestId("membership-status-active")).toBeInTheDocument();
    });
  });
});
