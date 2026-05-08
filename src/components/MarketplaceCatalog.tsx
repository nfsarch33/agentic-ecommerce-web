"use client";

import { useMemo, useState } from "react";
import type { PluginManifest } from "@/lib/domain/marketplace";
import { PluginCard } from "./PluginCard";

export interface MarketplaceCatalogProps {
  readonly plugins: readonly PluginManifest[];
  readonly error?: string;
}

export function MarketplaceCatalog({ plugins, error }: MarketplaceCatalogProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of plugins) if (p.category) set.add(p.category);
    return Array.from(set).sort();
  }, [plugins]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return plugins.filter((p) => {
      if (category && p.category !== category) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.vendor.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q)
      );
    });
  }, [plugins, query, category]);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Marketplace</h1>
      </header>
      {error ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800" data-testid="marketplace-error">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search plugins..."
          aria-label="Search plugins"
          data-testid="marketplace-search"
          className="w-64 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
        />
        {categories.length > 0 ? (
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Filter by category"
            data-testid="marketplace-category"
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        ) : null}
      </div>
      {filtered.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500" data-testid="marketplace-empty">
          No plugins match your filters.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <PluginCard key={p.slug} manifest={p} />
          ))}
        </div>
      )}
    </div>
  );
}
