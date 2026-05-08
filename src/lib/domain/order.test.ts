import { describe, expect, it } from "vitest";
import {
  isInFlightOrder,
  isOrderStatus,
  isTerminalOrderStatus,
  orderShippingLines,
  type Order,
  type OrderItem,
  type OrderStatus,
  type OrderTotals,
  type ShippingAddress,
} from "./order";

// `order.ts` is a pure type-only module. These tests pin the public shape so a
// downstream rename (or accidental field removal) breaks the build / suite
// before it ships, and they ensure V8 instrumentation has registered the
// module path.

describe("order domain types", () => {
  it("accepts every supported OrderStatus value", () => {
    const statuses: OrderStatus[] = [
      "pending",
      "paid",
      "fulfilled",
      "shipped",
      "completed",
      "failed",
      "cancelled",
    ];
    expect(statuses).toHaveLength(7);
    expect(new Set(statuses).size).toBe(statuses.length);
  });

  it("constructs a fully populated Order satisfying every readonly field", () => {
    const shippingAddress: ShippingAddress = {
      name: "Jane Shopper",
      line1: "1 Market Street",
      line2: "Suite 200",
      city: "Sydney",
      region: "NSW",
      postalCode: "2000",
      country: "AU",
    };
    const item: OrderItem = {
      productId: "prod_1",
      sku: "BAND-001",
      title: "Resistance Band Set",
      quantity: 2,
      unitPrice: { amount: 2495, currency: "AUD" },
      lineTotal: { amount: 4990, currency: "AUD" },
    };
    const totals: OrderTotals = {
      subtotal: { amount: 4990, currency: "AUD" },
      shipping: { amount: 0, currency: "AUD" },
      total: { amount: 4990, currency: "AUD" },
    };
    const order: Order = {
      id: "ord_1",
      customerEmail: "buyer@example.com",
      status: "pending",
      shippingAddress,
      items: [item],
      totals,
      createdAt: "2026-05-08T00:00:00Z",
      updatedAt: "2026-05-08T00:00:00Z",
    };

    expect(order.shippingAddress.line2).toBe("Suite 200");
    expect(order.items).toHaveLength(1);
    expect(order.items[0]?.lineTotal.amount).toBe(4990);
    expect(order.totals.total.currency).toBe("AUD");
  });

  it("permits ShippingAddress without optional line2", () => {
    const minimal: ShippingAddress = {
      name: "Buyer",
      line1: "1 Main Street",
      city: "Sydney",
      region: "NSW",
      postalCode: "2000",
      country: "AU",
    };
    expect(minimal.line2).toBeUndefined();
  });
});

describe("isOrderStatus", () => {
  it("accepts every supported status string", () => {
    for (const status of [
      "pending",
      "paid",
      "fulfilled",
      "shipped",
      "completed",
      "failed",
      "cancelled",
    ] as const) {
      expect(isOrderStatus(status)).toBe(true);
    }
  });

  it("rejects unknown strings, non-strings, and falsy values", () => {
    expect(isOrderStatus("unknown")).toBe(false);
    expect(isOrderStatus("")).toBe(false);
    expect(isOrderStatus(null)).toBe(false);
    expect(isOrderStatus(undefined)).toBe(false);
    expect(isOrderStatus(42)).toBe(false);
    expect(isOrderStatus({ status: "pending" })).toBe(false);
  });
});

describe("isTerminalOrderStatus / isInFlightOrder", () => {
  it("treats completed, failed, and cancelled as terminal", () => {
    expect(isTerminalOrderStatus("completed")).toBe(true);
    expect(isTerminalOrderStatus("failed")).toBe(true);
    expect(isTerminalOrderStatus("cancelled")).toBe(true);
  });

  it("treats every fulfillment-stage status as in-flight", () => {
    for (const status of ["pending", "paid", "fulfilled", "shipped"] as const) {
      expect(isTerminalOrderStatus(status)).toBe(false);
      expect(isInFlightOrder({ status })).toBe(true);
    }
  });

  it("isInFlightOrder is false once the order reaches a terminal state", () => {
    expect(isInFlightOrder({ status: "completed" })).toBe(false);
    expect(isInFlightOrder({ status: "cancelled" })).toBe(false);
  });
});

describe("orderShippingLines", () => {
  it("collapses line2 into the street line when present", () => {
    const lines = orderShippingLines({
      name: "Jane Shopper",
      line1: "1 Market Street",
      line2: "Suite 200",
      city: "Sydney",
      region: "NSW",
      postalCode: "2000",
      country: "AU",
    });
    expect(lines).toEqual([
      "Jane Shopper",
      "1 Market Street, Suite 200",
      "Sydney, NSW 2000",
      "AU",
    ]);
  });

  it("omits line2 when missing", () => {
    const lines = orderShippingLines({
      name: "Jane Shopper",
      line1: "1 Market Street",
      city: "Sydney",
      region: "NSW",
      postalCode: "2000",
      country: "AU",
    });
    expect(lines).toEqual([
      "Jane Shopper",
      "1 Market Street",
      "Sydney, NSW 2000",
      "AU",
    ]);
  });
});
