import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { PaymentDashboard, type PaymentRecord } from "./PaymentDashboard";

const MOCK_PAYMENTS: PaymentRecord[] = [
  {
    payment_id: "p1",
    tenant_id: "t1",
    order_id: "o1",
    provider: "stripe",
    status: "succeeded",
    amount_cents: 5000,
    currency: "AUD",
    created_at: "2026-05-10T01:00:00Z",
  },
  {
    payment_id: "p2",
    tenant_id: "t1",
    order_id: "o2",
    provider: "paypal",
    status: "pending",
    amount_cents: 3000,
    currency: "AUD",
    created_at: "2026-05-10T02:00:00Z",
  },
  {
    payment_id: "p3",
    tenant_id: "t1",
    order_id: "o3",
    provider: "alipay",
    status: "succeeded",
    amount_cents: 8000,
    currency: "CNY",
    created_at: "2026-05-10T03:00:00Z",
  },
];

function mockFetch(data: { payments: PaymentRecord[]; total: number }) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  }) as unknown as typeof fetch;
}

function mockFetchError(status: number) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({ error: "fail" }),
  }) as unknown as typeof fetch;
}

describe("PaymentDashboard", () => {
  it("renders payment table with 3 providers", async () => {
    render(
      <PaymentDashboard
        tenantId="t1"
        fetchImpl={mockFetch({ payments: MOCK_PAYMENTS, total: 3 })}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText("3 payments")).toBeInTheDocument();
    });
    expect(screen.getByText("p1")).toBeInTheDocument();
    expect(screen.getByText("p2")).toBeInTheDocument();
    expect(screen.getByText("p3")).toBeInTheDocument();
  });

  it("shows provider icons", async () => {
    render(
      <PaymentDashboard
        tenantId="t1"
        fetchImpl={mockFetch({ payments: MOCK_PAYMENTS, total: 3 })}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText("stripe")).toBeInTheDocument();
    });
    expect(screen.getByText("paypal")).toBeInTheDocument();
    expect(screen.getByText("alipay")).toBeInTheDocument();
  });

  it("shows status badges", async () => {
    render(
      <PaymentDashboard
        tenantId="t1"
        fetchImpl={mockFetch({ payments: MOCK_PAYMENTS, total: 3 })}
      />,
    );
    await waitFor(() => {
      expect(screen.getAllByText("succeeded")).toHaveLength(2);
    });
    expect(screen.getByText("pending")).toBeInTheDocument();
  });

  it("shows empty state when no payments", async () => {
    render(
      <PaymentDashboard
        tenantId="t1"
        fetchImpl={mockFetch({ payments: [], total: 0 })}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText("No payments found")).toBeInTheDocument();
    });
  });

  it("shows error state on fetch failure", async () => {
    render(
      <PaymentDashboard
        tenantId="t1"
        fetchImpl={mockFetchError(500)}
      />,
    );
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(screen.getByText(/Failed to load payments/)).toBeInTheDocument();
  });

  it("has filter dropdowns", async () => {
    render(
      <PaymentDashboard
        tenantId="t1"
        fetchImpl={mockFetch({ payments: MOCK_PAYMENTS, total: 3 })}
      />,
    );
    await waitFor(() => {
      expect(screen.getByLabelText("Filter by provider")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Filter by status")).toBeInTheDocument();
  });
});
