import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MembershipActions } from "./MembershipActions";
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

describe("MembershipActions", () => {
  it("renders pause + cancel for active", () => {
    render(<MembershipActions membership={sub("active")} onAction={() => undefined} />);
    expect(screen.getByTestId("membership-action-pause")).toBeInTheDocument();
    expect(screen.getByTestId("membership-action-cancel")).toBeInTheDocument();
    expect(screen.queryByTestId("membership-action-resume")).not.toBeInTheDocument();
  });

  it("renders resume + cancel for paused", () => {
    render(<MembershipActions membership={sub("paused")} onAction={() => undefined} />);
    expect(screen.getByTestId("membership-action-resume")).toBeInTheDocument();
    expect(screen.getByTestId("membership-action-cancel")).toBeInTheDocument();
    expect(screen.queryByTestId("membership-action-pause")).not.toBeInTheDocument();
  });

  it("renders cancel only for trial", () => {
    render(<MembershipActions membership={sub("trial")} onAction={() => undefined} />);
    expect(screen.getByTestId("membership-action-cancel")).toBeInTheDocument();
    expect(screen.queryByTestId("membership-action-pause")).not.toBeInTheDocument();
    expect(screen.queryByTestId("membership-action-resume")).not.toBeInTheDocument();
  });

  it.each(["cancelled", "expired"] as const)("renders no-actions message for %s", (state) => {
    render(<MembershipActions membership={sub(state)} onAction={() => undefined} />);
    expect(screen.getByTestId("membership-actions-none")).toBeInTheDocument();
  });

  it("invokes onAction when clicked", () => {
    const handler = vi.fn();
    render(<MembershipActions membership={sub("active")} onAction={handler} />);
    fireEvent.click(screen.getByTestId("membership-action-pause"));
    expect(handler).toHaveBeenCalledWith("pause");
  });

  it("disables busy action and shows progress label", () => {
    render(<MembershipActions membership={sub("active")} onAction={() => undefined} busyAction="pause" />);
    const btn = screen.getByTestId("membership-action-pause");
    expect(btn).toBeDisabled();
    expect(btn.textContent).toMatch(/Pause/);
  });
});
