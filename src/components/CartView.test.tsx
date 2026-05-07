import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CartProvider } from "./CartProvider";
import { CartView } from "./CartView";
import type { CartState } from "@/lib/domain/cart";

const cartWithItems: CartState = {
  items: [
    {
      productId: "p_roller",
      title: "Foam roller",
      slug: "foam-roller",
      quantity: 2,
      unitPrice: { amount: 3500, currency: "AUD" },
    },
    {
      productId: "p_mat",
      title: "Yoga mat",
      slug: "yoga-mat",
      quantity: 1,
      unitPrice: { amount: 6995, currency: "AUD" },
    },
  ],
};

describe("CartView", () => {
  it("renders cart lines and subtotal", () => {
    render(
      <CartProvider initialState={cartWithItems}>
        <CartView />
      </CartProvider>,
    );

    expect(screen.getByRole("heading", { name: /your cart/i })).toBeInTheDocument();
    expect(screen.getByText("Foam roller")).toBeInTheDocument();
    expect(screen.getByText(/A\$139\.95/)).toBeInTheDocument();
  });

  it("updates quantity from the cart page", async () => {
    render(
      <CartProvider initialState={cartWithItems}>
        <CartView />
      </CartProvider>,
    );

    await userEvent.clear(screen.getByLabelText("Quantity for Foam roller"));
    await userEvent.type(screen.getByLabelText("Quantity for Foam roller"), "3");

    expect(screen.getByText(/A\$174\.95/)).toBeInTheDocument();
  });

  it("removes items and shows the empty state", async () => {
    render(
      <CartProvider
        initialState={{
          items: [cartWithItems.items[0]!],
        }}
      >
        <CartView />
      </CartProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: /remove foam roller/i }));

    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
  });
});
