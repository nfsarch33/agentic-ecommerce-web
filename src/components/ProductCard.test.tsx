import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductCard } from "./ProductCard";
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
    render(<ProductCard product={inStock} />);
    expect(screen.getByRole("heading", { name: /foam roller/i })).toBeInTheDocument();
    expect(screen.getByText(/A\$35\.00/)).toBeInTheDocument();
    expect(screen.getByText(/in stock/i)).toBeInTheDocument();
  });

  it("renders out of stock label and disables CTA", () => {
    render(<ProductCard product={outOfStock} />);
    expect(screen.getByText(/out of stock/i)).toBeInTheDocument();
    const cta = screen.getByRole("button", { name: /add to cart/i });
    expect(cta).toBeDisabled();
  });

  it("renders the description when present", () => {
    render(<ProductCard product={inStock} />);
    expect(screen.getByText(/dense black foam/i)).toBeInTheDocument();
  });
});
