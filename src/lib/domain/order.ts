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

export interface OrderStatusPresentation {
  readonly eyebrow: string;
  readonly title: string;
  readonly toneClassName: string;
}

const ORDER_STATUSES: readonly OrderStatus[] = [
  "pending",
  "paid",
  "fulfilled",
  "shipped",
  "completed",
  "failed",
  "cancelled",
];

const TERMINAL_STATUSES: ReadonlySet<OrderStatus> = new Set([
  "completed",
  "failed",
  "cancelled",
]);

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);
}

export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

export function isInFlightOrder(order: Pick<Order, "status">): boolean {
  return !isTerminalOrderStatus(order.status);
}

export function orderStatusPresentation(status: OrderStatus): OrderStatusPresentation {
  switch (status) {
    case "pending":
      return {
        eyebrow: "Order received",
        title: "Order received",
        toneClassName: "text-amber-700",
      };
    case "failed":
    case "cancelled":
      return {
        eyebrow: "Order needs attention",
        title: "Order needs attention",
        toneClassName: "text-red-700",
      };
    default:
      return {
        eyebrow: "Order confirmed",
        title: "Order confirmed",
        toneClassName: "text-green-700",
      };
  }
}

export function orderShippingLines(address: ShippingAddress): readonly string[] {
  const street = address.line2
    ? `${address.line1}, ${address.line2}`
    : address.line1;
  return [
    address.name,
    street,
    `${address.city}, ${address.region} ${address.postalCode}`,
    address.country,
  ];
}
