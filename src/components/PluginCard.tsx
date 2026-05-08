"use client";

import Link from "next/link";
import type { PluginManifest } from "@/lib/domain/marketplace";

export interface PluginCardProps {
  readonly manifest: PluginManifest;
}

export function PluginCard({ manifest }: PluginCardProps) {
  return (
    <article
      data-testid={`plugin-card-${manifest.slug}`}
      className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <header className="flex items-baseline justify-between">
        <h3 className="text-base font-semibold text-slate-900">{manifest.name}</h3>
        <span className="text-xs text-slate-500" data-testid={`plugin-card-version-${manifest.slug}`}>
          v{manifest.version}
        </span>
      </header>
      <p className="text-sm text-slate-600">{manifest.description ?? manifest.vendor}</p>
      <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-slate-600">
        <dt className="font-medium">Vendor</dt>
        <dd>{manifest.vendor}</dd>
        {manifest.category ? (
          <>
            <dt className="font-medium">Category</dt>
            <dd>{manifest.category}</dd>
          </>
        ) : null}
      </dl>
      <Link
        href={`/admin/marketplace/${manifest.slug}`}
        className="mt-auto inline-flex w-fit rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-800 hover:bg-slate-100"
        data-testid={`plugin-card-link-${manifest.slug}`}
      >
        View details
      </Link>
    </article>
  );
}
