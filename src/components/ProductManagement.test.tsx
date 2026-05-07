import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Product } from "@/lib/domain/product";
import { ProductManagement } from "./ProductManagement";

const products = [
  Product.fromInput({
    id: "p_1",
    sku: "BAND-001",
    title: "Resistance Band Set",
    slug: "resistance-band-set",
    price: { amount: 2495, currency: "AUD" },
    stock: 12,
  }),
];

describe("ProductManagement", () => {
  it("renders product inventory using existing product domain data", () => {
    render(<ProductManagement products={products} userRole="operator" />);

    expect(screen.getByRole("heading", { name: /product management/i })).toBeInTheDocument();
    expect(screen.getByText("Resistance Band Set")).toBeInTheDocument();
    expect(screen.getByText("BAND-001")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("marks viewer access as read-only", () => {
    render(<ProductManagement products={products} userRole="viewer" />);

    expect(screen.getByText(/view-only access/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /create product/i })).not.toBeInTheDocument();
  });
});
