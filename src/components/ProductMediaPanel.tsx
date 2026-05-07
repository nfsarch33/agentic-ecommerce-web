"use client";

import { useState } from "react";
import {
  sourceMedia,
  validateMediaAsset,
  type SourceMediaOptions,
  type ValidateMediaAssetOptions,
} from "@/lib/adapters/api/media";
import {
  mediaQAStatusLabel,
  mediaQAStatusTone,
  mediaStatusLabel,
  mediaStatusTone,
  type MediaAsset,
  type StatusTone,
} from "@/lib/domain/media";

export interface ProductMediaPanelProps {
  readonly apiBaseUrl: string;
  readonly productId: string;
  readonly initialAssets: readonly MediaAsset[];
  readonly sourceMediaImpl?: (opts: SourceMediaOptions) => Promise<MediaAsset>;
  readonly validateMediaAssetImpl?: (opts: ValidateMediaAssetOptions) => Promise<MediaAsset>;
}

const toneClasses: Record<StatusTone, string> = {
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  green: "bg-green-50 text-green-700 ring-green-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  gray: "bg-gray-100 text-gray-700 ring-gray-200",
};

function StatusBadge({ label, tone }: { readonly label: string; readonly tone: StatusTone }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${toneClasses[tone]}`}>
      {label}
    </span>
  );
}

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function assetTitle(asset: MediaAsset): string {
  return asset.metadata.title || asset.originalFilename;
}

export function ProductMediaPanel({
  apiBaseUrl,
  productId,
  initialAssets,
  sourceMediaImpl = sourceMedia,
  validateMediaAssetImpl = validateMediaAsset,
}: ProductMediaPanelProps) {
  const [assets, setAssets] = useState<readonly MediaAsset[]>(initialAssets);
  const [sourceUrl, setSourceUrl] = useState("");
  const [title, setTitle] = useState("");
  const [altText, setAltText] = useState("");
  const [tags, setTags] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSourceMedia(): Promise<void> {
    setMessage(null);
    setError(null);
    if (sourceUrl.trim() === "") {
      setError("Add a source URL before linking product media.");
      return;
    }
    setIsSubmitting(true);
    try {
      const asset = await sourceMediaImpl({
        baseUrl: apiBaseUrl,
        productId,
        sourceUrl: sourceUrl.trim(),
        metadata: {
          altText,
          title: title.trim() || "Untitled product media",
          tags: parseTags(tags),
        },
      });
      setAssets((current) => [asset, ...current]);
      setMessage("Product media source request queued.");
      setSourceUrl("");
      setTitle("");
      setAltText("");
      setTags("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add product media.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleValidate(asset: MediaAsset): Promise<void> {
    setMessage(null);
    setError(null);
    setIsSubmitting(true);
    try {
      const updated = await validateMediaAssetImpl({
        baseUrl: apiBaseUrl,
        mediaId: asset.id,
      });
      setAssets((current) =>
        current.map((candidate) => (candidate.id === updated.id ? updated : candidate)),
      );
      setMessage("Media validation complete.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to validate media.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-auto mt-8 max-w-6xl rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
            Media intelligence
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Product media</h2>
          <p className="mt-2 max-w-3xl text-sm text-gray-600">
            Link sourced media to this product and run QA checks before publishing.
          </p>
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
          {assets.length} asset{assets.length === 1 ? "" : "s"}
        </span>
      </div>

      {(message || error) && (
        <div
          role={error ? "alert" : "status"}
          className={`mt-5 rounded-md border p-4 text-sm ${
            error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-700"
          }`}
        >
          {error ?? message}
        </div>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div>
          <label htmlFor="product-media-source-url" className="text-sm font-semibold text-gray-900">
            Source URL
          </label>
          <input
            id="product-media-source-url"
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
            className="mt-2 w-full rounded-md border border-gray-300 p-3 text-sm text-gray-900 shadow-sm"
          />
        </div>
        <div>
          <label htmlFor="product-media-title" className="text-sm font-semibold text-gray-900">
            Title
          </label>
          <input
            id="product-media-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-2 w-full rounded-md border border-gray-300 p-3 text-sm text-gray-900 shadow-sm"
          />
        </div>
        <div>
          <label htmlFor="product-media-alt-text" className="text-sm font-semibold text-gray-900">
            Alt text
          </label>
          <input
            id="product-media-alt-text"
            value={altText}
            onChange={(event) => setAltText(event.target.value)}
            className="mt-2 w-full rounded-md border border-gray-300 p-3 text-sm text-gray-900 shadow-sm"
          />
        </div>
        <div className="lg:col-span-3">
          <label htmlFor="product-media-tags" className="text-sm font-semibold text-gray-900">
            Tags
          </label>
          <input
            id="product-media-tags"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            className="mt-2 w-full rounded-md border border-gray-300 p-3 text-sm text-gray-900 shadow-sm"
          />
        </div>
      </div>
      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => void handleSourceMedia()}
        className="mt-5 rounded-md bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white disabled:bg-gray-300"
      >
        Add product media
      </button>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {assets.map((asset) => (
          <article key={asset.id} className="rounded-lg border border-gray-200 p-4">
            <div className="flex flex-wrap gap-2">
              <StatusBadge
                label={mediaStatusLabel(asset.processingStatus)}
                tone={mediaStatusTone(asset.processingStatus)}
              />
              <StatusBadge
                label={asset.qaResult ? mediaQAStatusLabel(asset.qaResult.status) : "QA pending"}
                tone={asset.qaResult ? mediaQAStatusTone(asset.qaResult.status) : "gray"}
              />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-950">{assetTitle(asset)}</h3>
            <p className="mt-1 text-sm text-gray-600">
              {asset.metadata.altText || "Alt text missing"}
            </p>
            {asset.qaResult?.checks.map((check) => (
              <p key={`${asset.id}-${check.code}`} className="mt-2 text-xs text-gray-600">
                {check.message}
              </p>
            ))}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => void handleValidate(asset)}
              aria-label={`Validate ${assetTitle(asset)}`}
              className="mt-4 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 disabled:text-gray-400"
            >
              Validate media
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
