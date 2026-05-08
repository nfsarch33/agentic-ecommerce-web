import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/server/auth-session", () => ({
  requireServerSession: vi.fn(async () => ({
    user: { id: "u-1", email: "admin@example.com", role: "admin" as const },
    expiresAt: "2099-01-01T00:00:00Z",
  })),
}));

const usageImpl = vi.fn();
vi.mock("@/lib/adapters/api/billing", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@/lib/adapters/api/billing");
  return {
    ...actual,
    getBillingUsage: (input: unknown) => usageImpl(input),
  };
});

import BillingUsagePage from "./page";

describe("/admin/billing/usage page", () => {
  beforeEach(() => usageImpl.mockReset());

  it("renders rollups when fetched", async () => {
    usageImpl.mockResolvedValueOnce({
      tenantId: "tenant-a",
      plan: "starter",
      periodStart: "2026-05-08T00:00:00Z",
      periodEnd: "2026-06-07T00:00:00Z",
      rollups: [{ metric: "api.requests", value: 5, limit: 100 }],
    });
    const ui = await BillingUsagePage();
    render(ui);
    expect(screen.getByTestId("billing-usage-page")).toBeInTheDocument();
    expect(screen.getByTestId("usage-api.requests")).toBeInTheDocument();
  });

  it("renders error on failure", async () => {
    usageImpl.mockRejectedValueOnce(new Error("HTTP 500"));
    const ui = await BillingUsagePage();
    render(ui);
    expect(screen.getByTestId("billing-usage-error")).toBeInTheDocument();
  });
});
