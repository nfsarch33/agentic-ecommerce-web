"use client";

import { useState } from "react";
import { searchEvidenceSources } from "@/lib/adapters/api/fact-check";
import type { EvidenceSource } from "@/lib/domain/fact-check";
import { EvidenceSourceCard } from "./EvidenceSourceCard";

export type SearchEvidenceForViewer = (input: {
  readonly query: string;
  readonly productId?: string;
}) => Promise<readonly EvidenceSource[]>;

export interface RAGSourceViewerProps {
  readonly productId?: string;
  readonly apiBaseUrl?: string;
  readonly searchEvidenceImpl?: SearchEvidenceForViewer;
}

export function RAGSourceViewer({ productId, apiBaseUrl, searchEvidenceImpl }: RAGSourceViewerProps) {
  const [query, setQuery] = useState("");
  const [sources, setSources] = useState<readonly EvidenceSource[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(): Promise<void> {
    const trimmed = query.trim();
    setError(null);
    if (trimmed === "") {
      setError("Enter a source search query before searching RAG evidence.");
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    try {
      const nextSources = searchEvidenceImpl
        ? await searchEvidenceImpl({ query: trimmed, productId })
        : await searchEvidenceSources({
            baseUrl: apiBaseUrl ?? "",
            query: trimmed,
            productId,
            limit: 5,
          });
      setSources(nextSources);
    } catch (err) {
      setSources([]);
      setError(err instanceof Error ? err.message : "Unable to search RAG evidence sources.");
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <section
      aria-label="RAG source viewer"
      className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
      role="region"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">RAG source viewer</h2>
          <p className="mt-1 text-sm text-gray-600">Search the source library used to ground product claims.</p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <label className="flex-1 text-sm font-semibold text-gray-900" htmlFor="rag-source-query">
          Search source library
          <input
            id="rag-source-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="mt-2 w-full rounded-md border border-gray-300 p-2.5 text-sm font-normal text-gray-900 shadow-sm focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20"
            placeholder="Search by claim, SKU, or document text"
          />
        </label>
        <button
          type="button"
          disabled={isSearching}
          onClick={() => void handleSearch()}
          className="cursor-pointer rounded-md bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-[var(--color-brand-700)] disabled:cursor-wait disabled:bg-gray-300 sm:self-end"
        >
          {isSearching ? "Searching..." : "Search evidence"}
        </button>
      </div>
      {error && (
        <div role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {isSearching && (
        <div role="status" className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
          Searching RAG evidence...
        </div>
      )}
      <div className="mt-5 space-y-3">
        {sources.map((source) => (
          <EvidenceSourceCard key={source.id} source={source} />
        ))}
        {hasSearched && !isSearching && !error && sources.length === 0 && (
          <p className="rounded-md border border-dashed border-gray-300 p-4 text-sm text-gray-600">
            No RAG sources matched this query.
          </p>
        )}
      </div>
    </section>
  );
}
