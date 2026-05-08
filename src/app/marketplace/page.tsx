import type { Metadata } from "next";
import { listPublicMarketplaceUsecase } from "@/lib/usecases/list-public-marketplace";
import { PluginCatalogCard } from "@/components/PluginCatalogCard";
import { MarketplaceCategoryFilter } from "@/components/MarketplaceCategoryFilter";
import { MarketplaceSearchBar } from "@/components/MarketplaceSearchBar";
import { publicPageMetadata } from "@/lib/seo-metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...publicPageMetadata({
    title: "Marketplace | Agentic Ecommerce",
    description:
      "Browse plugins built for the Agentic Ecommerce marketplace. Public catalogue with categories, search, and detail pages.",
    canonical: "/marketplace",
  }),
};

export default async function MarketplaceStorefrontPage() {
  const baseUrl = process.env.MC_API_BASE_URL ?? "http://localhost:8080";
  const tenantId = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID ?? "tenant_public";
  const result = await listPublicMarketplaceUsecase({ baseUrl, tenantId });
  return (
    <main
      data-testid="marketplace-storefront"
      className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12"
    >
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Marketplace</h1>
          <p className="mt-2 text-base text-slate-700">
            Discover plugins built for Agentic Ecommerce. Browse the catalogue, filter
            by category, or search for a specific integration.
          </p>
        </div>
        <MarketplaceSearchBar />
        <MarketplaceCategoryFilter categories={result.categories} />
      </header>

      {result.error ? (
        <p
          role="alert"
          data-testid="marketplace-storefront-error"
          className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          {result.error}
        </p>
      ) : null}

      {result.plugins.length === 0 && !result.error ? (
        <p
          data-testid="marketplace-storefront-empty"
          className="rounded-md border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500"
        >
          The marketplace is open for submissions. Build a plugin with the{" "}
          <a className="text-blue-700 underline" href="/developers/sdk">
            Plugin SDK
          </a>{" "}
          and submit it for review.
        </p>
      ) : (
        <section
          aria-label="Marketplace plugins"
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          {result.plugins.map((plugin) => (
            <PluginCatalogCard key={plugin.slug} manifest={plugin} />
          ))}
        </section>
      )}
    </main>
  );
}
