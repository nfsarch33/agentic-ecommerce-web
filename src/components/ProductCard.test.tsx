import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductCard } from "./ProductCard";
import { CartProvider, useCart } from "@/components/CartProvider";
import { Product } from "@/lib/domain/product";

const inStock = Product.fromInput({
  id: "p_1",
  title: "Foam roller",
  slug: "foam-roller",
  price: { amount: 3500, currency: "AUD" },
  stock: 5,
  description: "Dense black foam.",
});

const outOfStock = Product.fromInput({
  id: "p_2",
  title: "Yoga mat",
  slug: "yoga-mat",
  price: { amount: 6995, currency: "AUD" },
  stock: 0,
});

describe("ProductCard", () => {
  it("renders title, price, and stock state", () => {
    render(
      <CartProvider>
        <ProductCard product={inStock} />
      </CartProvider>,
    );
    expect(screen.getByRole("heading", { name: /foam roller/i })).toBeInTheDocument();
    expect(screen.getByText(/A\$35\.00/)).toBeInTheDocument();
    expect(screen.getByText(/in stock/i)).toBeInTheDocument();
  });

  it("renders out of stock label and disables CTA", () => {
    render(
      <CartProvider>
        <ProductCard product={outOfStock} />
      </CartProvider>,
    );
    expect(screen.getByText(/out of stock/i)).toBeInTheDocument();
    const cta = screen.getByRole("button", { name: /add to cart/i });
    expect(cta).toBeDisabled();
  });

  it("renders the description when present", () => {
    render(
      <CartProvider>
        <ProductCard product={inStock} />
      </CartProvider>,
    );
    expect(screen.getByText(/dense black foam/i)).toBeInTheDocument();
  });

  it("dispatches in-stock products into the cart", async () => {
    function CartProbe() {
      const { itemCount } = useCart();
      return <output aria-label="cart item count">{itemCount}</output>;
    }

    render(
      <CartProvider>
        <ProductCard product={inStock} />
        <CartProbe />
      </CartProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: /add to cart/i }));

    expect(screen.getByLabelText("cart item count")).toHaveTextContent("1");
  });
});
