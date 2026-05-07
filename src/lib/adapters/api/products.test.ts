import { describe, it, expect } from "vitest";
import { fetchProducts, ProductsApiError } from "./products";
import type { Product } from "@/lib/domain/product";

function asResponse(body: unknown, init: ResponseInit = { status: 200 }): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    ...init,
  });
}

describe("fetchProducts", () => {
  it("returns parsed Product entities", async () => {
    const mockFetch = async () =>
      asResponse({
        products: [
          {
            id: "018f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c",
            sku: "ROLLER-001",
            title: "Foam roller",
            slug: "foam-roller",
            price: { amount: 3500, currency: "AUD" },
            stock: 5,
            description: "Dense black foam.",
          },
          {
            id: "118f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c",
            sku: "MAT-001",
            title: "Yoga mat",
            slug: "yoga-mat",
            price: { amount: 6995, currency: "AUD" },
            stock: 0,
          },
        ],
        total: 2,
        page: 1,
        per_page: 20,
      });
    const products: Product[] = await fetchProducts({
      baseUrl: "http://api.test",
      fetchImpl: mockFetch,
    });
    expect(products).toHaveLength(2);
    expect(products[0]?.id).toBe("018f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c");
    expect(products[0]?.sku).toBe("ROLLER-001");
    expect(products[0]?.title).toBe("Foam roller");
    expect(products[0]?.price.amount).toBe(3500);
    expect(products[1]?.stock).toBe(0);
  });

  it("throws ProductsApiError on non-2xx", async () => {
    const mockFetch = async () => asResponse({ error: "boom" }, { status: 500 });
    await expect(fetchProducts({ baseUrl: "http://api.test", fetchImpl: mockFetch })).rejects.toBeInstanceOf(
      ProductsApiError,
    );
  });

  it("throws on malformed payload (missing products array)", async () => {
    const mockFetch = async () => asResponse({ total: 0, page: 1, per_page: 20 });
    await expect(fetchProducts({ baseUrl: "http://api.test", fetchImpl: mockFetch })).rejects.toBeInstanceOf(
      ProductsApiError,
    );
  });

  it("propagates upstream network errors as ProductsApiError", async () => {
    const mockFetch = async () => {
      throw new Error("ECONNREFUSED");
    };
    await expect(fetchProducts({ baseUrl: "http://api.test", fetchImpl: mockFetch })).rejects.toBeInstanceOf(
      ProductsApiError,
    );
  });

  it("uses /api/v1/products endpoint", async () => {
    let calledUrl = "";
    const mockFetch = async (input: RequestInfo | URL) => {
      calledUrl = typeof input === "string" ? input : input.toString();
      return asResponse({ products: [], total: 0, page: 1, per_page: 20 });
    };
    await fetchProducts({ baseUrl: "http://api.test", fetchImpl: mockFetch });
    expect(calledUrl).toBe("http://api.test/api/v1/products");
  });

  it("rejects an empty baseUrl at the boundary", async () => {
    await expect(
      fetchProducts({ baseUrl: "", fetchImpl: async () => asResponse({ products: [] }) }),
    ).rejects.toBeInstanceOf(ProductsApiError);
  });
});
