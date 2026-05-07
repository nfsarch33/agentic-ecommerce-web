import { describe, it, expect, vi } from "vitest";
import { listProducts, type ListProductsDeps } from "./list-products";
import { Product } from "@/lib/domain/product";

function deps(overrides: Partial<ListProductsDeps> = {}): ListProductsDeps {
  return {
    fetchProductsImpl: vi.fn(),
    ...overrides,
  };
}

const sampleProducts = [
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
    stock: 0,
  }),
];

describe("listProducts use case", () => {
  it("returns products from the adapter", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(sampleProducts);
    const result = await listProducts({}, deps({ fetchProductsImpl: fetchImpl }));
    expect(result.products).toHaveLength(2);
    expect(result.products[0]?.title).toBe("Foam roller");
  });

  it("filters out-of-stock products by default when onlyInStock is true", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(sampleProducts);
    const result = await listProducts({ onlyInStock: true }, deps({ fetchProductsImpl: fetchImpl }));
    expect(result.products).toHaveLength(1);
    expect(result.products[0]?.id).toBe("018f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c");
  });

  it("propagates adapter errors", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("boom"));
    await expect(listProducts({}, deps({ fetchProductsImpl: fetchImpl }))).rejects.toThrow("boom");
  });
});
