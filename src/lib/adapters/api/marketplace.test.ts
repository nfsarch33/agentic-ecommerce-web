import { describe, expect, it, vi } from "vitest";
import {
  MarketplaceApiError,
  activateMarketplacePlugin,
  deactivateMarketplacePlugin,
  fetchInstallationSettings,
  fetchMarketplacePlugin,
  installMarketplacePlugin,
  listMarketplacePlugins,
  parseInstallation,
  parseManifest,
  uninstallMarketplacePlugin,
  updateInstallationSettings,
} from "./marketplace";

const baseManifest = {
  slug: "stripe-payments",
  name: "Stripe Payments",
  version: "1.2.0",
  vendor: "Agentic Labs",
  description: "Stripe gateway",
  category: "payments",
  homepage_url: "https://stripe.example",
  event_subscriptions: ["order.placed"],
  permissions: ["orders.read"],
  dependencies: [{ slug: "ses-email", constraint: "^1.0.0" }],
};

const baseInstallation = {
  tenant_id: "tenant-a",
  slug: "stripe-payments",
  installed_version: "1.2.0",
  state: "installed",
  installed_at: "2026-05-08T10:00:00Z",
  updated_at: "2026-05-08T10:00:00Z",
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("marketplace adapter", () => {
  it("listMarketplacePlugins paginates", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ plugins: [baseManifest], total: 1, page: 1, per_page: 20 }),
    );
    const out = await listMarketplacePlugins({
      baseUrl: "http://api.test",
      tenantId: "tenant-a",
      page: 1,
      perPage: 20,
      fetchImpl,
    });
    expect(out.total).toBe(1);
    expect(out.plugins[0]?.slug).toBe("stripe-payments");
  });

  it("listMarketplacePlugins requires baseUrl + tenantId", async () => {
    await expect(
      listMarketplacePlugins({ baseUrl: "", tenantId: "t", fetchImpl: vi.fn() }),
    ).rejects.toBeInstanceOf(MarketplaceApiError);
    await expect(
      listMarketplacePlugins({ baseUrl: "http://x", tenantId: "", fetchImpl: vi.fn() }),
    ).rejects.toBeInstanceOf(MarketplaceApiError);
  });

  it("listMarketplacePlugins surfaces HTTP errors", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 500 }));
    await expect(
      listMarketplacePlugins({ baseUrl: "http://x", tenantId: "t", fetchImpl }),
    ).rejects.toBeInstanceOf(MarketplaceApiError);
  });

  it("listMarketplacePlugins surfaces network errors", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("offline");
    });
    await expect(
      listMarketplacePlugins({ baseUrl: "http://x", tenantId: "t", fetchImpl }),
    ).rejects.toBeInstanceOf(MarketplaceApiError);
  });

  it("listMarketplacePlugins rejects non-array plugins", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ plugins: "x" }));
    await expect(
      listMarketplacePlugins({ baseUrl: "http://x", tenantId: "t", fetchImpl }),
    ).rejects.toBeInstanceOf(MarketplaceApiError);
  });

  it("fetchMarketplacePlugin round-trips", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(baseManifest));
    const out = await fetchMarketplacePlugin({
      baseUrl: "http://x",
      tenantId: "t",
      slug: "stripe-payments",
      fetchImpl,
    });
    expect(out.vendor).toBe("Agentic Labs");
  });

  it("install/activate/deactivate parse the installation row", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(baseInstallation, 201));
    const ins = await installMarketplacePlugin({
      baseUrl: "http://x",
      tenantId: "tenant-a",
      slug: "stripe-payments",
      fetchImpl,
    });
    expect(ins.state).toBe("installed");

    const fetchImpl2 = vi.fn(async () =>
      jsonResponse({ ...baseInstallation, state: "active" }),
    );
    const act = await activateMarketplacePlugin({
      baseUrl: "http://x",
      tenantId: "tenant-a",
      slug: "stripe-payments",
      fetchImpl: fetchImpl2,
    });
    expect(act.state).toBe("active");

    const fetchImpl3 = vi.fn(async () =>
      jsonResponse({ ...baseInstallation, state: "deactivated" }),
    );
    const deact = await deactivateMarketplacePlugin({
      baseUrl: "http://x",
      tenantId: "tenant-a",
      slug: "stripe-payments",
      fetchImpl: fetchImpl3,
    });
    expect(deact.state).toBe("deactivated");
  });

  it("install requires slug + handles network error", async () => {
    await expect(
      installMarketplacePlugin({ baseUrl: "http://x", tenantId: "t", slug: "", fetchImpl: vi.fn() }),
    ).rejects.toBeInstanceOf(MarketplaceApiError);
    const fetchImpl = vi.fn(async () => {
      throw new Error("offline");
    });
    await expect(
      installMarketplacePlugin({ baseUrl: "http://x", tenantId: "t", slug: "stripe", fetchImpl }),
    ).rejects.toBeInstanceOf(MarketplaceApiError);
  });

  it("uninstall hits DELETE", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }));
    await expect(
      uninstallMarketplacePlugin({ baseUrl: "http://x", tenantId: "t", slug: "stripe", fetchImpl }),
    ).resolves.toBeUndefined();
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://x/api/v1/marketplace/plugins/stripe",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("uninstall surfaces failure status", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 500 }));
    await expect(
      uninstallMarketplacePlugin({ baseUrl: "http://x", tenantId: "t", slug: "stripe", fetchImpl }),
    ).rejects.toBeInstanceOf(MarketplaceApiError);
  });

  it("settings round-trip", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ settings: { webhook: "https://x" } }));
    const out = await fetchInstallationSettings({
      baseUrl: "http://x",
      tenantId: "t",
      slug: "stripe",
      fetchImpl,
    });
    expect(out.settings).toEqual({ webhook: "https://x" });

    const fetchImpl2 = vi.fn(async () => jsonResponse({ settings: { webhook: "https://y" } }));
    const out2 = await updateInstallationSettings({
      baseUrl: "http://x",
      tenantId: "t",
      slug: "stripe",
      values: { webhook: "https://y" },
      fetchImpl: fetchImpl2,
    });
    expect(out2.settings).toEqual({ webhook: "https://y" });
  });

  it("parseManifest rejects invalid payloads", () => {
    expect(() => parseManifest({})).toThrow(MarketplaceApiError);
    expect(() => parseManifest({ slug: "x" })).toThrow(MarketplaceApiError);
  });

  it("parseInstallation rejects invalid state", () => {
    expect(() =>
      parseInstallation({ ...baseInstallation, state: "ghost" }),
    ).toThrow(MarketplaceApiError);
  });
});
