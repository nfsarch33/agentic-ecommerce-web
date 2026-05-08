import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Subscription } from "@/lib/domain/billing";
import { BillingDashboard } from "./BillingDashboard";

const sub: Subscription = {
  id: "sub_1",
  tenantId: "tenant-a",
  planId: "starter",
  state: "active",
  currentPeriodStart: "2026-05-08T00:00:00Z",
  currentPeriodEnd: "2026-06-07T00:00:00Z",
  cancelAtPeriodEnd: false,
  createdAt: "2026-05-08T00:00:00Z",
  updatedAt: "2026-05-08T00:00:00Z",
};

describe("BillingDashboard", () => {
  it("renders empty state", () => {
    render(<BillingDashboard baseUrl="http://x" tenantId="tenant-a" subscriptions={[]} />);
    expect(screen.getByTestId("billing-empty")).toBeInTheDocument();
  });

  it("renders error", () => {
    render(
      <BillingDashboard baseUrl="http://x" tenantId="tenant-a" subscriptions={[]} error="boom" />,
    );
    expect(screen.getByTestId("billing-error")).toHaveTextContent("boom");
  });

  it("disables buttons by state", () => {
    render(
      <BillingDashboard
        baseUrl="http://x"
        tenantId="tenant-a"
        subscriptions={[{ ...sub, state: "canceled" }]}
      />,
    );
    expect((screen.getByTestId("subscription-cancel-sub_1") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId("subscription-pause-sub_1") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId("subscription-resume-sub_1") as HTMLButtonElement).disabled).toBe(true);
  });

  it("invokes pause and updates state on success", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({
        id: sub.id,
        tenant_id: sub.tenantId,
        plan_id: sub.planId,
        state: "paused",
        current_period_start: sub.currentPeriodStart,
        current_period_end: sub.currentPeriodEnd,
        cancel_at_period_end: false,
        created_at: sub.createdAt,
        updated_at: sub.updatedAt,
      }), { status: 200, headers: new Headers({ "content-type": "application/json" }) }),
    );
    vi.stubGlobal("fetch", fetchImpl as unknown as typeof fetch);
    render(
      <BillingDashboard baseUrl="http://x" tenantId="tenant-a" subscriptions={[sub]} />,
    );
    fireEvent.click(screen.getByTestId("subscription-pause-sub_1"));
    await waitFor(() => {
      expect(screen.getByTestId("subscription-status-paused")).toBeInTheDocument();
    });
    vi.unstubAllGlobals();
  });

  it("surfaces api error", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 500 }));
    vi.stubGlobal("fetch", fetchImpl as unknown as typeof fetch);
    render(
      <BillingDashboard baseUrl="http://x" tenantId="tenant-a" subscriptions={[sub]} />,
    );
    fireEvent.click(screen.getByTestId("subscription-pause-sub_1"));
    await waitFor(() => {
      expect(screen.getByTestId("billing-action-error")).toBeInTheDocument();
    });
    vi.unstubAllGlobals();
  });
});
