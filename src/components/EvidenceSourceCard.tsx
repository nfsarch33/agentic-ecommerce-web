import type { EvidenceSource } from "@/lib/domain/fact-check";

function metadataEntries(metadata: Readonly<Record<string, unknown>>): string[] {
  return Object.entries(metadata)
    .filter(([, value]) => ["string", "number", "boolean"].includes(typeof value))
    .map(([key, value]) => `${key}: ${String(value)}`);
}

export function EvidenceSourceCard({ source }: { readonly source: EvidenceSource }) {
  const entries = metadataEntries(source.metadata);

  return (
    <article
      aria-label={source.title}
      className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold text-gray-900">{source.title}</h4>
          <p className="mt-1 text-xs text-gray-500">{source.uri}</p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-700">
          {Math.round(source.similarity * 100)}% match
        </span>
      </div>
      {source.sourceType && (
        <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">{source.sourceType}</p>
      )}
      <blockquote className="mt-3 border-l-2 border-[var(--color-brand-500)] pl-3 leading-6">
        {source.excerpt}
      </blockquote>
      {entries.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
          {entries.map((entry) => (
            <li key={entry} className="rounded-full bg-white px-2 py-1">
              {entry}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
