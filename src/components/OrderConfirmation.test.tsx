import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { OrderConfirmation } from "./OrderConfirmation";
import type { Order } from "@/lib/domain/order";

const order: Order = {
  id: "218f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c",
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
      productId: "018f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c",
      sku: "ROLLER-001",
      title: "Foam roller",
      quantity: 2,
      unitPrice: { amount: 3500, currency: "AUD" },
      lineTotal: { amount: 7000, currency: "AUD" },
    },
  ],
  totals: {
    subtotal: { amount: 7000, currency: "AUD" },
    shipping: { amount: 0, currency: "AUD" },
    total: { amount: 7000, currency: "AUD" },
  },
  createdAt: "2026-05-07T04:00:00Z",
  updatedAt: "2026-05-07T04:00:00Z",
};

describe("OrderConfirmation", () => {
  it("renders a pending order as received instead of confirmed", () => {
    render(<OrderConfirmation order={order} />);

    expect(screen.getByRole("heading", { name: /order received/i })).toBeInTheDocument();
    expect(screen.queryByText(/^order confirmed$/i)).not.toBeInTheDocument();
    expect(screen.getByText("218f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c")).toBeInTheDocument();
    expect(screen.getByText(/pending/i)).toBeInTheDocument();
    expect(screen.getByText("buyer@example.com")).toBeInTheDocument();
    expect(screen.getAllByText(/A\$70\.00/)).toHaveLength(2);
  });
});
