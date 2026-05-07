import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductList } from "./ProductList";
import { CartProvider } from "./CartProvider";
import { Product } from "@/lib/domain/product";

describe("ProductList", () => {
  it("renders one ProductCard per product", () => {
    const products = [
      Product.fromInput({
        id: "018f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c",
        sku: "ROLLER-001",
        title: "Foam roller",
        slug: "foam-roller",
        price: { amount: 3500, currency: "AUD" },
        stock: 5,
      }),
      Product.fromInput({
        id: "118f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c",
        sku: "MAT-001",
        title: "Yoga mat",
        slug: "yoga-mat",
        price: { amount: 6995, currency: "AUD" },
        stock: 1,
      }),
    ];
    render(
      <CartProvider>
        <ProductList products={products} />
      </CartProvider>,
    );
    expect(screen.getByRole("heading", { name: /foam roller/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /yoga mat/i })).toBeInTheDocument();
  });

  it("renders the empty state when there are no products", () => {
    render(<ProductList products={[]} />);
    expect(screen.getByText(/no products available/i)).toBeInTheDocument();
  });
});
