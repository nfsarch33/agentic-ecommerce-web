import { describe, it, expect, vi } from "vitest";
import { fetchProductBySlug, ProductsApiError } from "./products";

function makeFetch(status: number, body: unknown): typeof fetch {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
}

const validProduct = {
  id: "018f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c",
  sku: "WIDGET-PRO",
  title: "Widget Pro",
  slug: "widget-pro",
  price: { amount: 4999, currency: "AUD" },
  stock: 12,
  description: "A premium widget",
};

describe("fetchProductBySlug", () => {
  it("returns a valid product when the backend responds 200", async () => {
    const mockFetch = makeFetch(200, validProduct);
    const product = await fetchProductBySlug({
      baseUrl: "http://localhost:8080",
      slug: "widget-pro",
      fetchImpl: mockFetch,
    });
    expect(product.id).toBe("018f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c");
    expect(product.sku).toBe("WIDGET-PRO");
    expect(product.title).toBe("Widget Pro");
    expect(product.slug).toBe("widget-pro");
    expect(product.price.amount).toBe(4999);
    expect(product.stock).toBe(12);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/products/widget-pro",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("throws ProductsApiError with 'not found' for HTTP 404", async () => {
    const mockFetch = makeFetch(404, { error: "not found" });
    await expect(
      fetchProductBySlug({
        baseUrl: "http://localhost:8080",
        slug: "nonexistent",
        fetchImpl: mockFetch,
      }),
    ).rejects.toThrow(ProductsApiError);
    await expect(
      fetchProductBySlug({
        baseUrl: "http://localhost:8080",
        slug: "nonexistent",
        fetchImpl: mockFetch,
      }),
    ).rejects.toThrow("HTTP 404");
  });

  it("throws ProductsApiError on network error", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    await expect(
      fetchProductBySlug({
        baseUrl: "http://localhost:8080",
        slug: "widget-pro",
        fetchImpl: mockFetch,
      }),
    ).rejects.toThrow(ProductsApiError);
    await expect(
      fetchProductBySlug({
        baseUrl: "http://localhost:8080",
        slug: "widget-pro",
        fetchImpl: mockFetch,
      }),
    ).rejects.toThrow("network error");
  });

  it("throws ProductsApiError on invalid JSON response", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response("not json", {
        status: 200,
        headers: { "content-type": "text/plain" },
      }),
    );
    await expect(
      fetchProductBySlug({
        baseUrl: "http://localhost:8080",
        slug: "widget-pro",
        fetchImpl: mockFetch,
      }),
    ).rejects.toThrow("invalid JSON");
  });

  it("throws ProductsApiError when baseUrl is empty", async () => {
    await expect(
      fetchProductBySlug({
        baseUrl: "",
        slug: "widget-pro",
      }),
    ).rejects.toThrow("baseUrl is required");
  });

  it("throws ProductsApiError when slug is empty", async () => {
    await expect(
      fetchProductBySlug({
        baseUrl: "http://localhost:8080",
        slug: "",
      }),
    ).rejects.toThrow("slug is required");
  });

  it("passes abort signal to fetch", async () => {
    const controller = new AbortController();
    const mockFetch = makeFetch(200, validProduct);
    await fetchProductBySlug({
      baseUrl: "http://localhost:8080",
      slug: "widget-pro",
      fetchImpl: mockFetch,
      signal: controller.signal,
    });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: controller.signal }),
    );
  });
});
