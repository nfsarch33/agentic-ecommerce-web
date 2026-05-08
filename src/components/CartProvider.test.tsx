import { act, render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import { CartProvider, useCart } from "./CartProvider";
import type { CartAddItem, CartState } from "@/lib/domain/cart";

const roller: CartAddItem = {
  productId: "018f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c",
  sku: "ROLLER-001",
  title: "Foam roller",
  slug: "foam-roller",
  unitPrice: { amount: 3500, currency: "AUD" },
};

function CartProbe() {
  const { state, dispatch, itemCount, totals } = useCart();
  return (
    <div>
      <p data-testid="count">{itemCount}</p>
      <p data-testid="subtotal">{totals.subtotal}</p>
      <p data-testid="currency">{totals.currency}</p>
      <p data-testid="items">{state.items.length}</p>
      <button type="button" onClick={() => dispatch({ type: "addItem", item: roller })}>
        Add
      </button>
    </div>
  );
}

describe("CartProvider", () => {
  it("provides empty cart state by default", () => {
    render(
      <CartProvider>
        <CartProbe />
      </CartProvider>,
    );
    expect(screen.getByTestId("count")).toHaveTextContent("0");
    expect(screen.getByTestId("subtotal")).toHaveTextContent("0");
    expect(screen.getByTestId("currency")).toHaveTextContent("AUD");
    expect(screen.getByTestId("items")).toHaveTextContent("0");
  });

  it("hydrates from initialState and recomputes totals after dispatch", () => {
    const initialState: CartState = {
      items: [
        {
          productId: roller.productId,
          sku: roller.sku,
          title: roller.title,
          slug: roller.slug,
          unitPrice: roller.unitPrice,
          quantity: 2,
        },
      ],
    };

    render(
      <CartProvider initialState={initialState}>
        <CartProbe />
      </CartProvider>,
    );

    expect(screen.getByTestId("count")).toHaveTextContent("2");
    expect(screen.getByTestId("subtotal")).toHaveTextContent("7000");
    expect(screen.getByTestId("currency")).toHaveTextContent("AUD");

    act(() => {
      screen.getByRole("button", { name: /add/i }).click();
    });

    expect(screen.getByTestId("count")).toHaveTextContent("3");
    expect(screen.getByTestId("subtotal")).toHaveTextContent("10500");
  });

  it("throws when useCart is invoked outside a CartProvider", () => {
    expect(() => renderHook(() => useCart())).toThrow(/inside CartProvider/);
  });

  it("memoises the context value across renders without dispatch", () => {
    const wrapper = ({ children }: { readonly children: ReactNode }) => (
      <CartProvider>{children}</CartProvider>
    );
    const { result, rerender } = renderHook(() => useCart(), { wrapper });
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
