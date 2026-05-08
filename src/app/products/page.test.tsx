import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const fetchProducts = vi.fn();
const listProducts = vi.fn();

vi.mock("@/lib/adapters/api/products", () => ({
  fetchProducts: (...args: unknown[]) => fetchProducts(...args),
}));

vi.mock("@/lib/usecases/list-products", () => ({
  listProducts: (...args: unknown[]) => listProducts(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import ProductsPage from "./page";
import { CartProvider } from "@/components/CartProvider";

function renderWithCart(node: React.ReactNode) {
  return render(<CartProvider>{node}</CartProvider>);
}

const product = {
  id: "018f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c",
  sku: "BAND-001",
  title: "Resistance Band Set",
  slug: "resistance-band-set",
  price: { amount: 2495, currency: "AUD" as const },
  stock: 12,
};

describe("ProductsPage", () => {
  it("renders the Products heading and the product list returned by the usecase", async () => {
    listProducts.mockResolvedValueOnce({ products: [product] });

    const page = await ProductsPage();
    renderWithCart(page);

    expect(screen.getByRole("heading", { name: "Products", level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Live inventory/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Resistance Band Set/ })).toBeInTheDocument();
    expect(listProducts).toHaveBeenCalledWith(
      { onlyInStock: false },
      expect.objectContaining({ fetchProductsImpl: expect.any(Function) }),
    );
  });

  it("renders an empty list when the usecase returns no products", async () => {
    listProducts.mockResolvedValueOnce({ products: [] });
    const page = await ProductsPage();
    renderWithCart(page);
    expect(screen.getByRole("heading", { name: "Products", level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2 })).toBeNull();
  });
});
