"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface MarketplaceSearchBarProps {
  readonly initialQuery?: string;
  readonly placeholder?: string;
}

export function MarketplaceSearchBar({
  initialQuery = "",
  placeholder = "Search marketplace plugins...",
}: MarketplaceSearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  return (
    <form
      data-testid="marketplace-search-bar"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = query.trim();
        const params = new URLSearchParams();
        if (trimmed) params.set("q", trimmed);
        router.push(`/marketplace/search${params.toString() ? `?${params}` : ""}`);
      }}
      className="flex items-center gap-2"
    >
      <label htmlFor="marketplace-search-input" className="sr-only">
        Search marketplace plugins
      </label>
      <input
        id="marketplace-search-input"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        data-testid="marketplace-search-input"
        className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
      />
      <button
        type="submit"
        data-testid="marketplace-search-submit"
        className="rounded-md border border-blue-500 bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600"
      >
        Search
      </button>
    </form>
  );
}
