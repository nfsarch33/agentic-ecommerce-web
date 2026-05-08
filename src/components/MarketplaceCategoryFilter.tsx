import Link from "next/link";

export interface MarketplaceCategoryFilterProps {
  readonly categories: readonly string[];
  readonly activeCategory?: string;
}

/**
 * MarketplaceCategoryFilter renders the public catalogue's category
 * navigation. The All link clears the filter; each category link
 * routes to /marketplace/categories/[category]. Server-side rendered
 * to keep the public surface SEO-friendly (no JS required).
 */
export function MarketplaceCategoryFilter({
  categories,
  activeCategory,
}: MarketplaceCategoryFilterProps) {
  if (categories.length === 0) {
    return null;
  }
  return (
    <nav
      aria-label="Marketplace categories"
      data-testid="marketplace-category-filter"
      className="flex flex-wrap items-center gap-2"
    >
      <Link
        href="/marketplace"
        data-testid="marketplace-category-link-all"
        className={`rounded-full border px-3 py-1 text-xs font-medium ${
          !activeCategory
            ? "border-blue-500 bg-blue-500 text-white"
            : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
        }`}
      >
        All
      </Link>
      {categories.map((category) => {
        const isActive = activeCategory === category;
        return (
          <Link
            key={category}
            href={`/marketplace/categories/${category}`}
            data-testid={`marketplace-category-link-${category}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              isActive
                ? "border-blue-500 bg-blue-500 text-white"
                : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
            }`}
          >
            {category}
          </Link>
        );
      })}
    </nav>
  );
}
