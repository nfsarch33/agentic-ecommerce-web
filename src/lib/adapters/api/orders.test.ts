import { describe, expect, it, vi } from "vitest";
import { createOrder, fetchOrder, OrdersApiError, type CreateOrderRequest } from "./orders";

function jsonResponse(body: unknown, init: ResponseInit = { status: 200 }): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    ...init,
  });
}

const createOrderRequest = {
  customerEmail: "buyer@example.com",
  deliveryOption: "standard",
  idempotencyKey: "checkout-abc123",
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
      slug: "foam-roller",
      quantity: 2,
      unitPrice: { amount: 3500, currency: "AUD" },
    },
  ],
} as CreateOrderRequest & { deliveryOption: string; idempotencyKey: string };

const rawOrder = {
  id: "218f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c",
  customer_email: "buyer@example.com",
  status: "pending",
  shipping_address: {
    name: "Buyer Example",
    line1: "1 Market Street",
    city: "Sydney",
    region: "NSW",
    postal_code: "2000",
    country: "AU",
  },
  items: [
    {
      product_id: "018f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c",
      sku: "ROLLER-001",
      title: "Foam roller",
      quantity: 2,
      unit_price: { amount: 3500, currency: "AUD" },
      line_total: { amount: 7000, currency: "AUD" },
    },
  ],
  totals: {
    subtotal: { amount: 7000, currency: "AUD" },
    shipping: { amount: 0, currency: "AUD" },
    total: { amount: 7000, currency: "AUD" },
  },
  created_at: "2026-05-07T04:00:00Z",
  updated_at: "2026-05-07T04:00:00Z",
};

describe("createOrder", () => {
  it("posts the expected v0.2 checkout contract and parses the order response", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse(rawOrder, { status: 201 }));

    const order = await createOrder({
      baseUrl: "http://api.test",
      order: createOrderRequest,
      fetchImpl: mockFetch,
    });

    expect(order.id).toBe("218f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c");
    expect(order.status).toBe("pending");
    expect(order.totals.total.amount).toBe(7000);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/orders",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "content-type": "application/json" }),
        body: JSON.stringify({
          customer_email: "buyer@example.com",
          delivery_option: "standard",
          idempotency_key: "checkout-abc123",
          shipping_address: {
            name: "Buyer Example",
            line1: "1 Market Street",
            city: "Sydney",
            region: "NSW",
            postal_code: "2000",
            country: "AU",
          },
          items: [
            {
              product_id: "018f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c",
              sku: "ROLLER-001",
              title: "Foam roller",
              quantity: 2,
              unit_price: { amount: 3500, currency: "AUD" },
            },
          ],
        }),
      }),
    );
  });

  it("wraps non-2xx responses in OrdersApiError", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ error: "validation failed" }, { status: 422 }));

    await expect(
      createOrder({ baseUrl: "http://api.test", order: createOrderRequest, fetchImpl: mockFetch }),
    ).rejects.toBeInstanceOf(OrdersApiError);
  });
});

describe("fetchOrder", () => {
  it("fetches and parses an order by id", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse(rawOrder));

    const order = await fetchOrder({ baseUrl: "http://api.test", orderId: "ord_123", fetchImpl: mockFetch });

    expect(order.customerEmail).toBe("buyer@example.com");
    expect(order.items[0]?.sku).toBe("ROLLER-001");
    expect(order.items[0]?.lineTotal.amount).toBe(7000);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/orders/ord_123",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("rejects malformed order payloads", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ id: "ord_bad" }));

    await expect(fetchOrder({ baseUrl: "http://api.test", orderId: "ord_bad", fetchImpl: mockFetch })).rejects.toThrow(
      OrdersApiError,
    );
  });

  it("requires a baseUrl", async () => {
    await expect(fetchOrder({ baseUrl: "", orderId: "ord_x" })).rejects.toThrow(
      /baseUrl is required/,
    );
  });

  it("requires an orderId", async () => {
    await expect(fetchOrder({ baseUrl: "http://api.test", orderId: "" })).rejects.toThrow(
      /orderId is required/,
    );
  });

  it("URL-encodes the orderId in the request path", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse(rawOrder));
    await fetchOrder({
      baseUrl: "http://api.test",
      orderId: "ord 1/2",
      fetchImpl: mockFetch,
    });
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/orders/ord%201%2F2",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("wraps fetch network failures in OrdersApiError", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    await expect(
      fetchOrder({ baseUrl: "http://api.test", orderId: "ord_x", fetchImpl: mockFetch }),
    ).rejects.toThrow(/network error/);
  });

  it("wraps non-2xx responses in OrdersApiError", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ error: "not found" }, { status: 404 }));
    await expect(
      fetchOrder({ baseUrl: "http://api.test", orderId: "ord_x", fetchImpl: mockFetch }),
    ).rejects.toThrow(/HTTP 404/);
  });
});

describe("createOrder edge cases", () => {
  it("requires a baseUrl", async () => {
    await expect(createOrder({ baseUrl: "", order: createOrderRequest })).rejects.toThrow(
      /baseUrl is required/,
    );
  });

  it("wraps fetch network failures in OrdersApiError", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    await expect(
      createOrder({ baseUrl: "http://api.test", order: createOrderRequest, fetchImpl: mockFetch }),
    ).rejects.toThrow(/network error/);
  });

  it("rejects responses whose JSON cannot be parsed", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response("not json", { status: 200, headers: { "content-type": "application/json" } }),
    );
    await expect(
      createOrder({ baseUrl: "http://api.test", order: createOrderRequest, fetchImpl: mockFetch }),
    ).rejects.toThrow(/invalid JSON/);
  });
});
