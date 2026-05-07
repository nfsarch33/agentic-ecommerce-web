import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProductsAdminPage from "./page";
import { Product } from "@/lib/domain/product";

vi.mock("@/lib/server/auth-session", () => ({
  requireServerSession: vi.fn(),
}));

vi.mock("@/lib/usecases/list-products", () => ({
  listProducts: vi.fn(),
}));

import { requireServerSession } from "@/lib/server/auth-session";
import { listProducts } from "@/lib/usecases/list-products";

const mockRequireServerSession = vi.mocked(requireServerSession);
const mockListProducts = vi.mocked(listProducts);

describe("Admin products page", () => {
  it("loads products and passes the current role to product management", async () => {
    mockRequireServerSession.mockResolvedValue({
      user: { id: "u_1", email: "operator@example.com", role: "operator" },
      expiresAt: "2026-05-07T10:00:00Z",
    });
    mockListProducts.mockResolvedValue({
      products: [
        Product.fromInput({
          id: "p_1",
          sku: "BAND-001",
          title: "Resistance Band Set",
          slug: "resistance-band-set",
          price: { amount: 2495, currency: "AUD" },
          stock: 12,
        }),
      ],
    });

    render(await ProductsAdminPage());

    expect(screen.getByRole("heading", { name: /product management/i })).toBeInTheDocument();
    expect(screen.getByText("Resistance Band Set")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create product/i })).toBeInTheDocument();
  });
});
