import type { Money } from "@/lib/domain/product";
import type { Order, OrderStatus, ShippingAddress } from "@/lib/domain/order";

export type DeliveryOption = "standard" | "express";

export interface CreateOrderItem {
  readonly productId: string;
  readonly sku: string;
  readonly title: string;
  readonly slug: string;
  readonly quantity: number;
  readonly unitPrice: Money;
}

export interface CreateOrderRequest {
  readonly customerEmail: string;
  readonly deliveryOption: DeliveryOption;
  readonly idempotencyKey: string;
  readonly shippingAddress: ShippingAddress;
  readonly items: readonly CreateOrderItem[];
}

export interface CreateOrderOptions {
  readonly baseUrl: string;
  readonly order: CreateOrderRequest;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface FetchOrderOptions {
  readonly baseUrl: string;
  readonly orderId: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export class OrdersApiError extends Error {
  override readonly name = "OrdersApiError";
  override readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.cause = cause;
  }
}

interface RawShippingAddress {
  readonly name?: unknown;
  readonly line1?: unknown;
  readonly line2?: unknown;
  readonly city?: unknown;
  readonly region?: unknown;
  readonly postal_code?: unknown;
  readonly country?: unknown;
}

interface RawOrderItem {
  readonly product_id?: unknown;
  readonly sku?: unknown;
  readonly title?: unknown;
  readonly quantity?: unknown;
  readonly unit_price?: unknown;
  readonly line_total?: unknown;
}

interface RawOrder {
  readonly id?: unknown;
  readonly customer_email?: unknown;
  readonly status?: unknown;
  readonly shipping_address?: unknown;
  readonly items?: unknown;
  readonly totals?: unknown;
  readonly created_at?: unknown;
  readonly updated_at?: unknown;
}

const statuses = new Set<OrderStatus>(["pending", "paid", "fulfilled", "shipped", "completed", "failed", "cancelled"]);
const currencies = new Set<Money["currency"]>(["AUD", "USD", "GBP", "EUR"]);

function parseMoney(raw: unknown, label: string): Money {
  const value = raw as { amount?: unknown; currency?: unknown };
  if (
    !value ||
    typeof value.amount !== "number" ||
    !Number.isInteger(value.amount) ||
    typeof value.currency !== "string" ||
    !currencies.has(value.currency as Money["currency"])
  ) {
    throw new OrdersApiError(`${label} must be { amount:number, currency }`);
  }
  return { amount: value.amount, currency: value.currency as Money["currency"] };
}

function parseString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new OrdersApiError(`${label} must be a non-empty string`);
  }
  return value;
}

function parseShippingAddress(raw: unknown): ShippingAddress {
  const value = raw as RawShippingAddress;
  return {
    name: parseString(value?.name, "shipping_address.name"),
    line1: parseString(value?.line1, "shipping_address.line1"),
    line2: typeof value?.line2 === "string" && value.line2.trim() !== "" ? value.line2 : undefined,
    city: parseString(value?.city, "shipping_address.city"),
    region: parseString(value?.region, "shipping_address.region"),
    postalCode: parseString(value?.postal_code, "shipping_address.postal_code"),
    country: parseString(value?.country, "shipping_address.country"),
  };
}

function parseOrderItem(raw: unknown): Order["items"][number] {
  const value = raw as RawOrderItem;
  const quantity = value?.quantity;
  if (!Number.isInteger(quantity) || (quantity as number) < 1) {
    throw new OrdersApiError("order item quantity must be a positive integer");
  }
  return {
    productId: parseString(value?.product_id, "items.product_id"),
    sku: parseString(value?.sku, "items.sku"),
    title: parseString(value?.title, "items.title"),
    quantity: quantity as number,
    unitPrice: parseMoney(value?.unit_price, "items.unit_price"),
    lineTotal: parseMoney(value?.line_total, "items.line_total"),
  };
}

function parseOrder(raw: unknown): Order {
  const value = raw as RawOrder;
  const status = value?.status;
  if (typeof status !== "string" || !statuses.has(status as OrderStatus)) {
    throw new OrdersApiError("order.status is invalid");
  }
  if (!Array.isArray(value?.items)) {
    throw new OrdersApiError("order.items must be an array");
  }
  const totals = value?.totals as { subtotal?: unknown; shipping?: unknown; total?: unknown } | undefined;
  return {
    id: parseString(value?.id, "order.id"),
    customerEmail: parseString(value?.customer_email, "order.customer_email"),
    status: status as OrderStatus,
    shippingAddress: parseShippingAddress(value?.shipping_address),
    items: value.items.map(parseOrderItem),
    totals: {
      subtotal: parseMoney(totals?.subtotal, "order.totals.subtotal"),
      shipping: parseMoney(totals?.shipping, "order.totals.shipping"),
      total: parseMoney(totals?.total, "order.totals.total"),
    },
    createdAt: parseString(value?.created_at, "order.created_at"),
    updatedAt: parseString(value?.updated_at, "order.updated_at"),
  };
}

function toRawCreateOrder(input: CreateOrderRequest): unknown {
  return {
    customer_email: input.customerEmail,
    delivery_option: input.deliveryOption,
    idempotency_key: input.idempotencyKey,
    shipping_address: {
      name: input.shippingAddress.name,
      line1: input.shippingAddress.line1,
      line2: input.shippingAddress.line2,
      city: input.shippingAddress.city,
      region: input.shippingAddress.region,
      postal_code: input.shippingAddress.postalCode,
      country: input.shippingAddress.country,
    },
    items: input.items.map((item) => ({
      product_id: item.productId,
      sku: item.sku,
      title: item.title,
      quantity: item.quantity,
      unit_price: item.unitPrice,
    })),
  };
}

async function readOrderResponse(res: Response, label: string): Promise<Order> {
  if (!res.ok) {
    throw new OrdersApiError(`${label}: HTTP ${res.status}`);
  }
  try {
    return parseOrder(await res.json());
  } catch (err) {
    if (err instanceof OrdersApiError) throw err;
    throw new OrdersApiError(`${label}: invalid JSON`, err);
  }
}

export async function createOrder(opts: CreateOrderOptions): Promise<Order> {
  if (!opts.baseUrl) throw new OrdersApiError("createOrder: baseUrl is required");
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(`${opts.baseUrl}/api/v1/orders`, {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify(toRawCreateOrder(opts.order)),
      signal: opts.signal,
    });
  } catch (err) {
    throw new OrdersApiError("createOrder: network error", err);
  }
  return readOrderResponse(res, "createOrder");
}

export async function fetchOrder(opts: FetchOrderOptions): Promise<Order> {
  if (!opts.baseUrl) throw new OrdersApiError("fetchOrder: baseUrl is required");
  if (!opts.orderId) throw new OrdersApiError("fetchOrder: orderId is required");
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(`${opts.baseUrl}/api/v1/orders/${encodeURIComponent(opts.orderId)}`, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: opts.signal,
    });
  } catch (err) {
    throw new OrdersApiError("fetchOrder: network error", err);
  }
  return readOrderResponse(res, "fetchOrder");
}
