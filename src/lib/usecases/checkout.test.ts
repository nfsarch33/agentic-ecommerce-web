import { describe, expect, it } from "vitest";
import { buildCheckoutOrder, CheckoutValidationError } from "./checkout";
import { emptyCartState, type CartState } from "@/lib/domain/cart";
import type { ShippingAddress } from "@/lib/domain/order";

const shippingAddress: ShippingAddress = {
  name: "Jane Shopper",
  line1: "1 Market Street",
  city: "Sydney",
  region: "NSW",
  postalCode: "2000",
  country: "AU",
};

const cart: CartState = {
  items: [
    {
      productId: "018f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c",
      sku: "BAND-001",
      title: "Resistance Band Set",
      slug: "resistance-band-set",
      quantity: 2,
      unitPrice: { amount: 2495, currency: "AUD" },
    },
  ],
};

describe("buildCheckoutOrder", () => {
  it("builds a CreateOrderRequest from a populated cart", () => {
    const request = buildCheckoutOrder({
      cart,
      customerEmail: "buyer@example.com",
      deliveryOption: "standard",
      idempotencyKey: "checkout-123",
      shippingAddress,
    });

    expect(request).toEqual({
      customerEmail: "buyer@example.com",
      deliveryOption: "standard",
      idempotencyKey: "checkout-123",
      shippingAddress,
      items: [
        {
          productId: "018f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c",
          sku: "BAND-001",
          title: "Resistance Band Set",
          slug: "resistance-band-set",
          quantity: 2,
          unitPrice: { amount: 2495, currency: "AUD" },
        },
      ],
    });
  });

  it("throws CheckoutValidationError when the cart is empty", () => {
    expect(() =>
      buildCheckoutOrder({
        cart: emptyCartState,
        customerEmail: "buyer@example.com",
        deliveryOption: "standard",
        idempotencyKey: "checkout-123",
        shippingAddress,
      }),
    ).toThrow(CheckoutValidationError);
    expect(() =>
      buildCheckoutOrder({
        cart: emptyCartState,
        customerEmail: "buyer@example.com",
        deliveryOption: "standard",
        idempotencyKey: "checkout-123",
        shippingAddress,
      }),
    ).toThrow(/at least one item/);
  });

  it("preserves all supplied items in order", () => {
    const multi: CartState = {
      items: [
        ...cart.items,
        {
          productId: "118f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c",
          sku: "MAT-001",
          title: "Yoga mat",
          slug: "yoga-mat",
          quantity: 1,
          unitPrice: { amount: 6995, currency: "AUD" },
        },
      ],
    };
    const request = buildCheckoutOrder({
      cart: multi,
      customerEmail: "buyer@example.com",
      deliveryOption: "express",
      idempotencyKey: "checkout-456",
      shippingAddress,
    });
    expect(request.items.map((item) => item.sku)).toEqual(["BAND-001", "MAT-001"]);
    expect(request.deliveryOption).toBe("express");
    expect(request.idempotencyKey).toBe("checkout-456");
  });
});
