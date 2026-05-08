import { describe, expect, it, vi } from "vitest";
import { MarketplaceApiError } from "@/lib/adapters/api/marketplace";
import { listMarketplacePluginsUsecase } from "./list-marketplace-plugins";

describe("listMarketplacePluginsUsecase", () => {
  it("returns plugins on success", async () => {
    const listImpl = vi.fn(async () => ({
      plugins: [
        {
          slug: "stripe-payments",
          name: "Stripe",
          version: "1.0.0",
          vendor: "Acme",
          eventSubscriptions: [],
          permissions: [],
          dependencies: [],
        },
      ],
      total: 1,
      page: 1,
      perPage: 20,
    }));
    const out = await listMarketplacePluginsUsecase(
      { baseUrl: "http://x", tenantId: "t" },
      { listImpl },
    );
    expect(out.plugins).toHaveLength(1);
  });

  it("returns empty + error on MarketplaceApiError", async () => {
    const listImpl = vi.fn(async () => {
      throw new MarketplaceApiError("boom");
    });
    const out = await listMarketplacePluginsUsecase(
      { baseUrl: "http://x", tenantId: "t" },
      { listImpl },
    );
    expect(out.plugins).toHaveLength(0);
    expect(out.error).toBe("boom");
  });

  it("rethrows unknown errors", async () => {
    const listImpl = vi.fn(async () => {
      throw new Error("unexpected");
    });
    await expect(
      listMarketplacePluginsUsecase({ baseUrl: "http://x", tenantId: "t" }, { listImpl }),
    ).rejects.toThrow("unexpected");
  });
});
