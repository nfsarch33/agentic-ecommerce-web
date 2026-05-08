import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/server/auth-session", () => ({
  requireServerSession: vi.fn(async () => ({
    user: { id: "u-1", email: "admin@example.com", role: "admin" as const },
    expiresAt: "2099-01-01T00:00:00Z",
  })),
}));

const listImpl = vi.fn();
vi.mock("@/lib/adapters/api/billing", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@/lib/adapters/api/billing");
  return {
    ...actual,
    listBillingSubscriptions: (input: unknown) => listImpl(input),
  };
});

import BillingDashboardPage from "./page";

describe("/admin/billing page", () => {
  beforeEach(() => {
    listImpl.mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders dashboard with subscriptions", async () => {
    listImpl.mockResolvedValueOnce({
      subscriptions: [
        {
          id: "sub_1",
          tenantId: "tenant-a",
          planId: "starter",
          state: "active",
          currentPeriodStart: "2026-05-08T00:00:00Z",
          currentPeriodEnd: "2026-06-07T00:00:00Z",
          cancelAtPeriodEnd: false,
          createdAt: "2026-05-08T00:00:00Z",
          updatedAt: "2026-05-08T00:00:00Z",
        },
      ],
      total: 1,
      page: 1,
      perPage: 50,
    });
    const ui = await BillingDashboardPage();
    render(ui);
    expect(screen.getByTestId("billing-dashboard")).toBeInTheDocument();
    expect(screen.getByTestId("subscription-sub_1")).toBeInTheDocument();
  });

  it("renders error banner on adapter failure", async () => {
    listImpl.mockRejectedValueOnce(new Error("HTTP 500"));
    const ui = await BillingDashboardPage();
    render(ui);
    expect(screen.getByTestId("billing-error")).toBeInTheDocument();
  });
});
