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
    id: "p_1",
    title: "Foam roller",
    slug: "foam-roller",
    price: { amount: 3500, currency: "AUD" },
    stock: 5,
  }),
  Product.fromInput({
    id: "p_2",
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
    expect(result.products[0]?.id).toBe("p_1");
  });

  it("propagates adapter errors", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("boom"));
    await expect(listProducts({}, deps({ fetchProductsImpl: fetchImpl }))).rejects.toThrow("boom");
  });
});
