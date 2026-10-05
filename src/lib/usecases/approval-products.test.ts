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

  it("caps the fan-out: never more than 6 lookups in flight", async () => {
    let inFlight = 0;
    let peak = 0;
    const ids = Array.from({ length: 20 }, (_, i) => `p${i}`);
    const fetched = await loadApprovalProducts({
      baseUrl: "http://api.test",
      productIds: ids,
      fetchImpl: (async (opts: { slug: string }) => {
        inFlight++;
        peak = Math.max(peak, inFlight);
        await new Promise((r) => setTimeout(r, 5));
        inFlight--;
        return product(opts.slug, `Title ${opts.slug}`);
      }) as unknown as typeof import("@/lib/adapters/api/products").fetchProductBySlug,
    });
    // Mutant this kills: the pool cap removed (one GET per unique id,
    // all at once) — 20 waiting drafts open 20 parallel GETs on one page
    // load. Peak must never exceed 6, the join must not serialise
    // (peak > 1), and every id still lands.
    expect(peak).toBeLessThanOrEqual(6);
    expect(peak).toBeGreaterThan(1);
    expect(Object.keys(fetched)).toHaveLength(20);
  });
});
