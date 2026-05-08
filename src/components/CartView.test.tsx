import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CartProvider } from "./CartProvider";
import { CartView } from "./CartView";
import type { CartState } from "@/lib/domain/cart";

const cartWithItems: CartState = {
  items: [
    {
      productId: "018f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c",
      sku: "ROLLER-001",
      title: "Foam roller",
      slug: "foam-roller",
      quantity: 2,
      unitPrice: { amount: 3500, currency: "AUD" },
    },
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

  it("links to /products from the empty state", () => {
    render(
      <CartProvider>
        <CartView />
      </CartProvider>,
    );
    const link = screen.getByRole("link", { name: /browse products/i });
    expect(link).toHaveAttribute("href", "/products");
  });

  it("surfaces a quantity validation error when the user enters 0", async () => {
    render(
      <CartProvider initialState={cartWithItems}>
        <CartView />
      </CartProvider>,
    );

    const quantityInput = screen.getByLabelText("Quantity for Foam roller");
    await userEvent.clear(quantityInput);
    await userEvent.type(quantityInput, "0");

    expect(screen.getByRole("alert")).toHaveTextContent(/positive integer/i);
  });

  it("clears the cart when the operator clicks Clear cart", async () => {
    render(
      <CartProvider initialState={cartWithItems}>
        <CartView />
      </CartProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: /clear cart/i }));
    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
  });
});
