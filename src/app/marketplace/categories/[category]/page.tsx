import type { Metadata } from "next";
import Link from "next/link";
import { listPublicMarketplaceUsecase } from "@/lib/usecases/list-public-marketplace";
import { PluginCatalogCard } from "@/components/PluginCatalogCard";
import { MarketplaceCategoryFilter } from "@/components/MarketplaceCategoryFilter";
import { MarketplaceSearchBar } from "@/components/MarketplaceSearchBar";
import { publicPageMetadata } from "@/lib/seo-metadata";

export const dynamic = "force-dynamic";

interface PageProps {
  readonly params: Promise<{ category: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category } = await params;
  return {
    ...publicPageMetadata({
      title: `${category} plugins | Marketplace | Agentic Ecommerce`,
      description: `Marketplace plugins in the ${category} category. Browse vendors and integrations curated for the Agentic Ecommerce platform.`,
      canonical: `/marketplace/categories/${category}`,
    }),
  };
}

export default async function MarketplaceCategoryPage({ params }: PageProps) {
  const { category } = await params;
  const baseUrl = process.env.MC_API_BASE_URL ?? "http://localhost:8080";
  const tenantId = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID ?? "tenant_public";
  const result = await listPublicMarketplaceUsecase({ baseUrl, tenantId, category });

  return (
    <main
      data-testid={`marketplace-category-${category}`}
      className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12"
    >
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6">
        <nav aria-label="Breadcrumbs" className="text-sm text-slate-500">
          <Link href="/marketplace" className="hover:text-slate-800">
            Marketplace
          </Link>
          <span className="mx-2">/</span>
          <span className="text-slate-800">{category}</span>
        </nav>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            {category} plugins
          </h1>
          <p className="mt-2 text-base text-slate-700">
            Plugins in the <strong>{category}</strong> category.
          </p>
        </div>
        <MarketplaceSearchBar />
        <MarketplaceCategoryFilter
          categories={result.categories}
          activeCategory={category}
        />
      </header>

      {result.error ? (
        <p
          role="alert"
          data-testid="marketplace-category-error"
          className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          {result.error}
        </p>
      ) : null}

      {result.plugins.length === 0 ? (
        <p
          data-testid="marketplace-category-empty"
          className="rounded-md border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500"
        >
          No plugins are listed in this category yet.
        </p>
      ) : (
        <section
          aria-label={`${category} plugins`}
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
