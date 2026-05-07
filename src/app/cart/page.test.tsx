import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import CartPage from "./page";
import { CartProvider } from "@/components/CartProvider";

describe("CartPage", () => {
  it("renders the cart view", () => {
    render(
      <CartProvider>
        <CartPage />
      </CartProvider>,
    );

    expect(screen.getByRole("heading", { name: /your cart/i })).toBeInTheDocument();
  });
});
