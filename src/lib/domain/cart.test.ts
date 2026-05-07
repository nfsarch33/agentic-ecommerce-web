import { describe, expect, it } from "vitest";
import {
  CartValidationError,
  cartReducer,
  computeCartTotals,
  emptyCartState,
  type CartAddItem,
} from "./cart";

const roller: CartAddItem = {
  productId: "p_roller",
  title: "Foam roller",
  slug: "foam-roller",
  unitPrice: { amount: 3500, currency: "AUD" },
};

const mat: CartAddItem = {
  productId: "p_mat",
  title: "Yoga mat",
  slug: "yoga-mat",
  unitPrice: { amount: 6995, currency: "AUD" },
};

describe("cartReducer", () => {
  it("adds an item to an empty cart", () => {
    const state = cartReducer(emptyCartState, { type: "addItem", item: roller });

    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toMatchObject({ productId: "p_roller", quantity: 1 });
  });

  it("increments quantity when the same item is added again", () => {
    const once = cartReducer(emptyCartState, { type: "addItem", item: roller });
    const twice = cartReducer(once, { type: "addItem", item: roller, quantity: 2 });

    expect(twice.items[0]?.quantity).toBe(3);
  });

  it("removes an item by product id", () => {
    const withRoller = cartReducer(emptyCartState, { type: "addItem", item: roller });
    const withBoth = cartReducer(withRoller, { type: "addItem", item: mat });

    const next = cartReducer(withBoth, { type: "removeItem", productId: "p_roller" });

    expect(next.items.map((item) => item.productId)).toEqual(["p_mat"]);
  });

  it("updates item quantity", () => {
    const state = cartReducer(emptyCartState, { type: "addItem", item: roller });

    const next = cartReducer(state, { type: "updateQuantity", productId: "p_roller", quantity: 4 });

    expect(next.items[0]?.quantity).toBe(4);
  });

  it("clears every item", () => {
    const withItem = cartReducer(emptyCartState, { type: "addItem", item: roller });

    expect(cartReducer(withItem, { type: "clear" })).toEqual(emptyCartState);
  });

  it("computes subtotal from quantities and unit prices", () => {
    const withRollers = cartReducer(emptyCartState, { type: "addItem", item: roller, quantity: 2 });
    const withMat = cartReducer(withRollers, { type: "addItem", item: mat });

    expect(computeCartTotals(withMat)).toEqual({ subtotal: 13995, currency: "AUD" });
  });

  it("rejects invalid quantities", () => {
    expect(() => cartReducer(emptyCartState, { type: "addItem", item: roller, quantity: 0 })).toThrow(
      CartValidationError,
    );
    expect(() =>
      cartReducer(emptyCartState, { type: "updateQuantity", productId: "p_roller", quantity: 1.5 }),
    ).toThrow(CartValidationError);
  });
});
