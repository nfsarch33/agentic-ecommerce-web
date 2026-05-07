import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import OrderConfirmationPage from "./page";

vi.mock("@/lib/adapters/api/orders", () => ({
  fetchOrder: vi.fn(),
}));

import { fetchOrder } from "@/lib/adapters/api/orders";
import type { Order } from "@/lib/domain/order";

const order: Order = {
  id: "ord_123",
  customerEmail: "buyer@example.com",
  status: "pending",
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
  updatedAt: "2026-05-07T04:00:00Z",
};

describe("OrderConfirmationPage", () => {
  it("fetches the order and renders confirmation details", async () => {
    vi.mocked(fetchOrder).mockResolvedValue(order);

    const page = await OrderConfirmationPage({ params: Promise.resolve({ id: "ord_123" }) });
    render(page);

    expect(screen.getByText("ord_123")).toBeInTheDocument();
    expect(fetchOrder).toHaveBeenCalledWith(expect.objectContaining({ orderId: "ord_123" }));
  });
});
