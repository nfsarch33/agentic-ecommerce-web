import { describe, expect, it, vi } from "vitest";
import { listPublicMarketplaceUsecase } from "./list-public-marketplace";
import { MarketplaceApiError } from "@/lib/adapters/api/marketplace";
import type { PluginManifest } from "@/lib/domain/marketplace";

const samplePlugins: readonly PluginManifest[] = [
  {
    slug: "stripe-payments",
    name: "Stripe Payments",
    version: "1.2.0",
    vendor: "Agentic Labs",
    description: "Stripe checkout + webhook bridge.",
    category: "payments",
    eventSubscriptions: [],
    permissions: [],
    dependencies: [],
  },
  {
    slug: "ses-email",
    name: "SES Email",
    version: "1.0.0",
    vendor: "Agentic Labs",
    description: "Transactional email via Amazon SES.",
    category: "notifications",
    eventSubscriptions: [],
    permissions: [],
    dependencies: [],
  },
  {
    slug: "klaviyo-marketing",
    name: "Klaviyo Marketing",
    version: "0.4.1",
    vendor: "Klaviyo",
    description: "Sync segments + campaigns to Klaviyo.",
    category: "marketing",
    eventSubscriptions: [],
    permissions: [],
    dependencies: [],
  },
];

describe("listPublicMarketplaceUsecase", () => {
  it("returns all plugins and categories when no filter is set", async () => {
    const listImpl = vi.fn().mockResolvedValue({
      plugins: samplePlugins,
      total: samplePlugins.length,
      page: 1,
      perPage: samplePlugins.length,
    });
    const result = await listPublicMarketplaceUsecase(
      { baseUrl: "http://test", tenantId: "tenant-x" },
      { listImpl },
    );
    expect(result.plugins).toHaveLength(3);
    expect(result.categories).toEqual(["marketing", "notifications", "payments"]);
    expect(result.error).toBeUndefined();
  });

  it("filters by category", async () => {
    const listImpl = vi.fn().mockResolvedValue({
      plugins: samplePlugins,
      total: samplePlugins.length,
      page: 1,
      perPage: samplePlugins.length,
    });
    const result = await listPublicMarketplaceUsecase(
      { baseUrl: "http://test", tenantId: "tenant-x", category: "payments" },
      { listImpl },
    );
    expect(result.plugins.map((p) => p.slug)).toEqual(["stripe-payments"]);
  });

  it("filters by query against name + vendor + description", async () => {
    const listImpl = vi.fn().mockResolvedValue({
      plugins: samplePlugins,
      total: samplePlugins.length,
      page: 1,
      perPage: samplePlugins.length,
    });
    const result = await listPublicMarketplaceUsecase(
      { baseUrl: "http://test", tenantId: "tenant-x", query: "klaviyo" },
      { listImpl },
    );
    expect(result.plugins.map((p) => p.slug)).toEqual(["klaviyo-marketing"]);
  });

  it("falls back to public tenant id when none provided", async () => {
    const listImpl = vi.fn().mockResolvedValue({
      plugins: samplePlugins,
      total: samplePlugins.length,
      page: 1,
      perPage: samplePlugins.length,
    });
    await listPublicMarketplaceUsecase(
      { baseUrl: "http://test", tenantId: "" },
      { listImpl },
    );
    expect(listImpl).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "tenant_public" }),
    );
  });

  it("returns error when adapter throws MarketplaceApiError", async () => {
    const listImpl = vi.fn().mockRejectedValue(new MarketplaceApiError("network down", 500));
    const result = await listPublicMarketplaceUsecase(
      { baseUrl: "http://test", tenantId: "tenant-x" },
      { listImpl },
    );
    expect(result.error).toContain("network down");
    expect(result.plugins).toEqual([]);
    expect(result.categories).toEqual([]);
  });

  it("propagates non-marketplace errors", async () => {
    const listImpl = vi.fn().mockRejectedValue(new Error("kaboom"));
    await expect(
      listPublicMarketplaceUsecase({ baseUrl: "http://test", tenantId: "tenant-x" }, { listImpl }),
    ).rejects.toThrow("kaboom");
  });
});
