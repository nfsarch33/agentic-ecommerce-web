import { describe, expect, it, vi, beforeEach } from "vitest";
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
    listBillingInvoices: (input: unknown) => listImpl(input),
  };
});

import BillingInvoicesPage from "./page";

describe("/admin/billing/invoices page", () => {
  beforeEach(() => listImpl.mockReset());

  it("renders the invoice table", async () => {
    listImpl.mockResolvedValueOnce({
      invoices: [
        {
          id: "inv_1",
          tenantId: "tenant-a",
          subscriptionId: "sub_1",
          amount: 1900,
          currency: "AUD",
          status: "paid",
          periodStart: "2026-05-08T00:00:00Z",
          periodEnd: "2026-06-07T00:00:00Z",
          createdAt: "2026-05-08T00:00:00Z",
        },
      ],
      total: 1,
      page: 1,
      perPage: 50,
    });
    const ui = await BillingInvoicesPage();
    render(ui);
    expect(screen.getByTestId("billing-invoices-page")).toBeInTheDocument();
    expect(screen.getByTestId("invoice-row-inv_1")).toBeInTheDocument();
  });

  it("renders error on failure", async () => {
    listImpl.mockRejectedValueOnce(new Error("HTTP 500"));
    const ui = await BillingInvoicesPage();
    render(ui);
    expect(screen.getByTestId("billing-invoices-error")).toBeInTheDocument();
  });
});
