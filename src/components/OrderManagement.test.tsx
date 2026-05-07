import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Order } from "@/lib/domain/order";
import { OrderManagement } from "./OrderManagement";

const order: Order = {
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
  items: [
    {
      productId: "p_1",
      title: "Resistance Band Set",
      sku: "BAND-001",
      quantity: 2,
      unitPrice: { amount: 2495, currency: "AUD" },
      lineTotal: { amount: 4990, currency: "AUD" },
    },
  ],
  totals: {
    subtotal: { amount: 4990, currency: "AUD" },
    shipping: { amount: 0, currency: "AUD" },
    total: { amount: 4990, currency: "AUD" },
  },
  createdAt: "2026-05-07T04:00:00Z",
  updatedAt: "2026-05-07T04:05:00Z",
};

describe("OrderManagement", () => {
  it("renders looked-up order details using the order domain shape", () => {
    render(<OrderManagement order={order} userRole="operator" lookupId="ord_123" />);

    expect(screen.getByRole("heading", { name: /order management/i })).toBeInTheDocument();
    expect(screen.getByText("ord_123")).toBeInTheDocument();
    expect(screen.getByText("buyer@example.com")).toBeInTheDocument();
    expect(screen.getByText("paid")).toBeInTheDocument();
    expect(screen.getByText("Resistance Band Set")).toBeInTheDocument();
  });

  it("does not expose mutation controls to viewers", () => {
    render(<OrderManagement order={order} userRole="viewer" lookupId="ord_123" />);

    expect(screen.getByText(/view-only access/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /fulfill order/i })).not.toBeInTheDocument();
  });
});
