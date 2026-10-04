import { describe, expect, it } from "vitest";
import { loadApprovalProducts } from "./approval-products";
import type { Product } from "@/lib/domain/product";

function product(id: string, title: string, description?: string): Product {
  return { id, sku: `SKU-${id}`, title, description } as Product;
}

describe("loadApprovalProducts", () => {
  it("joins unique product ids and skips failed lookups", async () => {
    const calls: string[] = [];
    const fetched = await loadApprovalProducts({
      baseUrl: "http://api.test",
      productIds: ["a", "b", "a", "c", ""],
      fetchImpl: (async (opts: { slug: string }) => {
        calls.push(opts.slug);
        if (opts.slug === "b") throw new Error("boom");
        return product(opts.slug, `Title ${opts.slug}`, `Draft for ${opts.slug}`);
      }) as unknown as typeof import("@/lib/adapters/api/products").fetchProductBySlug,
    });
    // Mutant this kills: duplicates (or the empty id) re-fetched — the
    // join hammers the API per row instead of per product.
    expect(calls.sort()).toEqual(["a", "b", "c"]);
    expect(fetched["a"]).toEqual({ id: "a", title: "Title a", sku: "SKU-a", description: "Draft for a" });
    expect(fetched["b"]).toBeUndefined();
    expect(fetched["c"]?.title).toBe("Title c");
  });
});
