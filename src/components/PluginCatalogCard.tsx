import Link from "next/link";
import type { PluginManifest } from "@/lib/domain/marketplace";

export interface PluginCatalogCardProps {
  readonly manifest: PluginManifest;
}

/**
 * PluginCatalogCard is the public-facing variant of PluginCard. It
 * links to the public /marketplace/[slug] detail page rather than
 * the admin install panel.
 */
export function PluginCatalogCard({ manifest }: PluginCatalogCardProps) {
  return (
    <article
      data-testid={`plugin-catalog-card-${manifest.slug}`}
      className="flex h-full flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <header className="flex items-baseline justify-between">
        <h3 className="text-base font-semibold text-slate-900">{manifest.name}</h3>
        <span
          className="text-xs text-slate-500"
          data-testid={`plugin-catalog-version-${manifest.slug}`}
        >
          v{manifest.version}
        </span>
      </header>
      <p className="text-sm text-slate-600">{manifest.description ?? manifest.vendor}</p>
      <dl className="mt-1 grid grid-cols-[max-content_1fr] gap-x-2 gap-y-1 text-xs text-slate-600">
        <dt className="font-medium">Vendor</dt>
        <dd>{manifest.vendor}</dd>
        {manifest.category ? (
          <>
            <dt className="font-medium">Category</dt>
            <dd>
              <Link
                href={`/marketplace/categories/${manifest.category}`}
                className="text-blue-700 underline hover:text-blue-900"
                data-testid={`plugin-catalog-category-${manifest.slug}`}
              >
                {manifest.category}
              </Link>
            </dd>
          </>
        ) : null}
      </dl>
      <Link
        href={`/marketplace/${manifest.slug}`}
        data-testid={`plugin-catalog-link-${manifest.slug}`}
        className="mt-auto inline-flex w-fit rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-800 hover:bg-slate-100"
      >
        View plugin
      </Link>
    </article>
  );
}
