import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

const fetchPlugin = vi.fn();
vi.mock("@/lib/adapters/api/marketplace", async () => {
  const actual = await vi.importActual<typeof import("@/lib/adapters/api/marketplace")>(
    "@/lib/adapters/api/marketplace",
  );
  return {
    ...actual,
    fetchMarketplacePlugin: (...args: Parameters<typeof actual.fetchMarketplacePlugin>) =>
      fetchPlugin(...args),
  };
});

const notFoundSpy = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/navigation", () => ({
  notFound: () => notFoundSpy(),
}));

import MarketplacePluginDetailPage, { generateMetadata } from "./page";

describe("/marketplace/[slug] page", () => {
  beforeEach(() => {
    fetchPlugin.mockReset();
    notFoundSpy.mockClear();
  });
  afterEach(() => vi.restoreAllMocks());

  it("renders the plugin detail when the manifest loads", async () => {
    fetchPlugin.mockResolvedValueOnce({
      slug: "stripe-payments",
      name: "Stripe Payments",
      version: "1.0.0",
      vendor: "Agentic Labs",
      description: "Stripe checkout + webhook bridge.",
      category: "payments",
      eventSubscriptions: ["order.placed"],
      permissions: ["catalog.read"],
      dependencies: [],
    });
    const ui = await MarketplacePluginDetailPage({ params: Promise.resolve({ slug: "stripe-payments" }) });
    render(ui);
    expect(screen.getByTestId("marketplace-detail-stripe-payments")).toBeInTheDocument();
    expect(screen.getByTestId("marketplace-detail-permission-catalog.read")).toBeInTheDocument();
    expect(screen.getByTestId("marketplace-detail-event-order.placed")).toBeInTheDocument();
    expect(screen.getByTestId("marketplace-detail-install-link")).toBeInTheDocument();
  });

  it("renders SoftwareApplication JSON-LD from the fetched manifest", async () => {
    fetchPlugin.mockResolvedValueOnce({
      slug: "stripe-payments",
      name: "Stripe Payments",
      version: "1.0.0",
      vendor: "Agentic Labs",
      description: "Stripe checkout + webhook bridge.",
      category: "payments",
      homepageUrl: "https://stripe.example",
      eventSubscriptions: ["order.placed"],
      permissions: ["catalog.read"],
      dependencies: [],
    });
    const ui = await MarketplacePluginDetailPage({ params: Promise.resolve({ slug: "stripe-payments" }) });
    const { container } = render(ui);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    const jsonLd = JSON.parse(script?.textContent ?? "{}") as Record<string, unknown>;
    expect(jsonLd["@type"]).toBe("SoftwareApplication");
    expect(jsonLd["name"]).toBe("Stripe Payments");
    expect(jsonLd["applicationCategory"]).toBe("payments");
    expect(jsonLd["softwareVersion"]).toBe("1.0.0");
    expect(jsonLd["url"]).toBe("/marketplace/stripe-payments");
    expect(jsonLd["publisher"]).toEqual(
      expect.objectContaining({
        "@type": "Organization",
        name: "Agentic Labs",
      }),
    );
  });

  it("renders the error block when the API returns a non-404 error", async () => {
    const { MarketplaceApiError } = await import("@/lib/adapters/api/marketplace");
    fetchPlugin.mockRejectedValueOnce(new MarketplaceApiError("network down", 500));
    const ui = await MarketplacePluginDetailPage({ params: Promise.resolve({ slug: "stripe-payments" }) });
    render(ui);
    expect(screen.getByTestId("marketplace-detail-error")).toBeInTheDocument();
  });

  it("invokes notFound when the slug is missing", async () => {
    const { MarketplaceApiError } = await import("@/lib/adapters/api/marketplace");
    fetchPlugin.mockRejectedValueOnce(new MarketplaceApiError("no such slug", 404));
    await expect(
      MarketplacePluginDetailPage({ params: Promise.resolve({ slug: "missing" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundSpy).toHaveBeenCalledOnce();
  });

  it("propagates non-MarketplaceApiError errors", async () => {
    fetchPlugin.mockRejectedValueOnce(new Error("kaboom"));
    await expect(
      MarketplacePluginDetailPage({ params: Promise.resolve({ slug: "stripe-payments" }) }),
    ).rejects.toThrow("kaboom");
  });

  it("generates per-slug metadata", async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ slug: "stripe-payments" }) });
    expect(meta.title).toContain("stripe-payments");
  });
});
