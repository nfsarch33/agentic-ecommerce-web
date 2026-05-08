import type { Metadata } from "next";
import Link from "next/link";
import { listPublicMarketplaceUsecase } from "@/lib/usecases/list-public-marketplace";
import { PluginCatalogCard } from "@/components/PluginCatalogCard";
import { MarketplaceSearchBar } from "@/components/MarketplaceSearchBar";
import { publicPageMetadata } from "@/lib/seo-metadata";

export const dynamic = "force-dynamic";

interface PageProps {
  readonly searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { q } = await searchParams;
  const trimmed = q?.trim() ?? "";
  return {
    ...publicPageMetadata({
      title: trimmed
        ? `Search "${trimmed}" | Marketplace | Agentic Ecommerce`
        : "Search marketplace | Agentic Ecommerce",
      description: trimmed
        ? `Marketplace plugins matching "${trimmed}".`
        : "Search the Agentic Ecommerce marketplace for plugins.",
      canonical: trimmed ? `/marketplace/search?q=${encodeURIComponent(trimmed)}` : "/marketplace/search",
    }),
  };
}

export default async function MarketplaceSearchPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const baseUrl = process.env.MC_API_BASE_URL ?? "http://localhost:8080";
  const tenantId = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID ?? "tenant_public";
  const result = query
    ? await listPublicMarketplaceUsecase({ baseUrl, tenantId, query })
    : { plugins: [], categories: [], total: 0, error: undefined };

  return (
    <main
      data-testid="marketplace-search"
      className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12"
    >
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6">
        <nav aria-label="Breadcrumbs" className="text-sm text-slate-500">
          <Link href="/marketplace" className="hover:text-slate-800">
            Marketplace
          </Link>
          <span className="mx-2">/</span>
          <span className="text-slate-800">Search</span>
        </nav>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Search marketplace</h1>
        <MarketplaceSearchBar initialQuery={query} />
      </header>

      {!query ? (
        <p
          data-testid="marketplace-search-empty-query"
          className="rounded-md border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500"
        >
          Enter a query above to search the catalogue.
        </p>
      ) : result.error ? (
        <p
          role="alert"
          data-testid="marketplace-search-error"
          className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          {result.error}
        </p>
      ) : result.plugins.length === 0 ? (
        <p
          data-testid="marketplace-search-no-results"
          className="rounded-md border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500"
        >
          No plugins match <strong>{query}</strong>.
        </p>
      ) : (
        <section
          aria-label={`Plugins matching "${query}"`}
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
