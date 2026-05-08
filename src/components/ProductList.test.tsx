import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductList } from "./ProductList";
import { CartProvider } from "./CartProvider";
import { Product } from "@/lib/domain/product";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("ProductList", () => {
  it("renders one ProductCard per product", () => {
    const products = [
      Product.fromInput({
        id: "p_1",
        sku: "ROLLER-001",
        title: "Foam roller",
        slug: "foam-roller",
        price: { amount: 3500, currency: "AUD" },
        stock: 5,
      }),
      Product.fromInput({
        id: "p_2",
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
