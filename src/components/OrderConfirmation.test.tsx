import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { OrderConfirmation } from "./OrderConfirmation";
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
  items: [
    {
      productId: "p_roller",
      title: "Foam roller",
      slug: "foam-roller",
      quantity: 2,
      unitPrice: { amount: 3500, currency: "AUD" },
      lineTotal: { amount: 7000, currency: "AUD" },
    },
  ],
  totals: {
    subtotal: { amount: 7000, currency: "AUD" },
    total: { amount: 7000, currency: "AUD" },
  },
  createdAt: "2026-05-07T04:00:00Z",
};

describe("OrderConfirmation", () => {
  it("renders order id, status, customer, and totals", () => {
    render(<OrderConfirmation order={order} />);

    expect(screen.getByRole("heading", { name: /order confirmed/i })).toBeInTheDocument();
    expect(screen.getByText("ord_123")).toBeInTheDocument();
    expect(screen.getByText(/pending/i)).toBeInTheDocument();
    expect(screen.getByText("buyer@example.com")).toBeInTheDocument();
    expect(screen.getAllByText(/A\$70\.00/)).toHaveLength(2);
  });
});
