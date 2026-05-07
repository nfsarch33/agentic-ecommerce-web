import type { Money } from "./product";

export type OrderStatus = "pending" | "paid" | "fulfilled" | "shipped" | "completed" | "failed" | "cancelled";

export interface ShippingAddress {
  readonly name: string;
  readonly line1: string;
  readonly line2?: string;
  readonly city: string;
  readonly region: string;
  readonly postalCode: string;
  readonly country: string;
}

export interface OrderItem {
  readonly productId: string;
  readonly sku: string;
  readonly title: string;
  readonly quantity: number;
  readonly unitPrice: Money;
  readonly lineTotal: Money;
}

export interface OrderTotals {
  readonly subtotal: Money;
  readonly shipping: Money;
  readonly total: Money;
}

export interface Order {
  readonly id: string;
  readonly customerEmail: string;
  readonly status: OrderStatus;
  readonly shippingAddress: ShippingAddress;
  readonly items: readonly OrderItem[];
  readonly totals: OrderTotals;
  readonly createdAt: string;
  readonly updatedAt: string;
}
