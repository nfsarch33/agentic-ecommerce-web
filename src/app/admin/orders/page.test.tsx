import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import OrdersAdminPage from "./page";

vi.mock("@/lib/server/auth-session", () => ({
  requireServerSession: vi.fn(),
}));

vi.mock("@/lib/adapters/api/orders", () => ({
  fetchOrder: vi.fn(),
}));

import { requireServerSession } from "@/lib/server/auth-session";
import { fetchOrder } from "@/lib/adapters/api/orders";

const mockRequireServerSession = vi.mocked(requireServerSession);
const mockFetchOrder = vi.mocked(fetchOrder);

describe("Admin orders page", () => {
  it("loads an order by query id using the existing order adapter", async () => {
    mockRequireServerSession.mockResolvedValue({
      user: { id: "u_1", email: "operator@example.com", role: "operator" },
      expiresAt: "2026-05-07T10:00:00Z",
    });
    mockFetchOrder.mockResolvedValue({
      id: "ord_123",
      customerEmail: "buyer@example.com",
      status: "paid",
      shippingAddress: {
        name: "Buyer Example",
        line1: "1 Market Street",
        city: "Sydney",
        region: "NSW",
        postalCode: "2000",
        country: "AU",
      },
      items: [],
      totals: {
        subtotal: { amount: 0, currency: "AUD" },
        shipping: { amount: 0, currency: "AUD" },
        total: { amount: 0, currency: "AUD" },
      },
      createdAt: "2026-05-07T04:00:00Z",
      updatedAt: "2026-05-07T04:05:00Z",
    });

    render(await OrdersAdminPage({ searchParams: Promise.resolve({ id: "ord_123" }) }));

    expect(screen.getByRole("heading", { name: /order management/i })).toBeInTheDocument();
    expect(screen.getByText("ord_123")).toBeInTheDocument();
    expect(mockFetchOrder).toHaveBeenCalledWith(expect.objectContaining({ orderId: "ord_123" }));
  });
});
