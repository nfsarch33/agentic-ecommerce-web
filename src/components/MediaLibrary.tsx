"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import {
  sourceMedia,
  updateMediaMetadata,
  type SourceMediaOptions,
  type UpdateMediaMetadataOptions,
} from "@/lib/adapters/api/media";
import {
  mediaProcessStateLabel,
  mediaProcessStateTone,
  mediaQAStatusLabel,
  mediaQAStatusTone,
  mediaReviewStateLabel,
  mediaReviewStateTone,
  mediaStatusLabel,
  mediaStatusTone,
  type MediaAsset,
  type ProcessingStatus,
  type StatusTone,
} from "@/lib/domain/media";

export interface MediaLibraryProps {
  readonly assets: readonly MediaAsset[];
  readonly apiBaseUrl?: string;
  readonly sourceMediaImpl?: (opts: SourceMediaOptions) => Promise<MediaAsset>;
  readonly updateMediaMetadataImpl?: (opts: UpdateMediaMetadataOptions) => Promise<MediaAsset>;
}

type FilterStatus = ProcessingStatus | "all";

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

function tagString(tags: readonly string[]): string {
  return tags.join(", ");
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

function formatBytes(bytes: number): string {
  if (bytes === 1) return "1 byte";
  return `${bytes} bytes`;
}

export function MediaLibrary({
  assets,
  apiBaseUrl = "",
  sourceMediaImpl = sourceMedia,
  updateMediaMetadataImpl = updateMediaMetadata,
}: MediaLibraryProps) {
  const [items, setItems] = useState<readonly MediaAsset[]>(assets);
  const [status, setStatus] = useState<FilterStatus>("all");
  const [selected, setSelected] = useState<MediaAsset | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [fileMetadata, setFileMetadata] = useState<SourceMediaOptions["file"]>();
  const [title, setTitle] = useState("");
  const [altText, setAltText] = useState("");
  const [tags, setTags] = useState("");
  const [editorTitle, setEditorTitle] = useState("");
  const [editorAltText, setEditorAltText] = useState("");
  const [editorTags, setEditorTags] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredAssets = useMemo(
    () => (status === "all" ? items : items.filter((asset) => asset.processingStatus === status)),
    [items, status],
  );

  function selectAsset(asset: MediaAsset): void {
    setSelected(asset);
    setEditorTitle(asset.metadata.title);
    setEditorAltText(asset.metadata.altText);
    setEditorTags(tagString(asset.metadata.tags));
    setMessage(null);
    setError(null);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    setFileMetadata(
      file
        ? {
            name: file.name,
            type: file.type || "application/octet-stream",
            size: file.size,
          }
        : undefined,
    );
  }

  async function handleSourceMedia(): Promise<void> {
    setMessage(null);
    setError(null);
    if (!sourceUrl.trim()) {
      setError("Add a source URL before sourcing media.");
      return;
    }
    setIsSubmitting(true);
    try {
      const asset = await sourceMediaImpl({
        baseUrl: apiBaseUrl,
        sourceUrl: sourceUrl.trim() || undefined,
        file: fileMetadata,
        metadata: {
          altText,
          title: title.trim() || fileMetadata?.name || "Untitled media",
          tags: parseTags(tags),
        },
      });
      setItems((current) => [asset, ...current]);
      setMessage("Media source request queued.");
      setSourceUrl("");
      setFileMetadata(undefined);
      setTitle("");
      setAltText("");
      setTags("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to source media.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSaveMetadata(): Promise<void> {
    if (!selected) return;
    setMessage(null);
    setError(null);
    setIsSubmitting(true);
    try {
      const updated = await updateMediaMetadataImpl({
        baseUrl: apiBaseUrl,
        mediaId: selected.id,
        metadata: {
          altText: editorAltText,
          title: editorTitle,
          tags: parseTags(editorTags),
        },
      });
      setItems((current) => current.map((asset) => (asset.id === updated.id ? updated : asset)));
      setSelected(updated);
      setMessage("Metadata saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save metadata.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <header className="mb-8">
        <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
          Admin media intelligence
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Media Library</h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          Source supplier images, inspect processing progress, edit metadata, and review media QA
          before linking assets to products.
        </p>
      </header>

      {(message || error) && (
        <div
          role={error ? "alert" : "status"}
          className={`mb-6 rounded-md border p-4 text-sm ${
            error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-700"
          }`}
        >
          {error ?? message}
        </div>
      )}

      <section className="mb-8 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Source media</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div>
            <label htmlFor="media-source-url" className="text-sm font-semibold text-gray-900">
              Source URL
            </label>
            <input
              id="media-source-url"
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              placeholder="https://supplier.example/image.png"
              className="mt-2 w-full rounded-md border border-gray-300 p-3 text-sm text-gray-900 shadow-sm"
            />
          </div>
          <div>
            <label htmlFor="media-file" className="text-sm font-semibold text-gray-900">
              File metadata
            </label>
            <input
              id="media-file"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="mt-2 block"
            />
            {fileMetadata && (
              <dl className="mt-3 grid gap-1 rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
                <div className="flex items-center justify-between gap-3">
                  <dt className="font-medium text-gray-700">Filename</dt>
                  <dd>{fileMetadata.name}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="font-medium text-gray-700">Type</dt>
                  <dd>{fileMetadata.type}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="font-medium text-gray-700">Size</dt>
                  <dd>{formatBytes(fileMetadata.size)}</dd>
                </div>
              </dl>
            )}
          </div>
          <div>
            <label htmlFor="media-title" className="text-sm font-semibold text-gray-900">
              Title
            </label>
            <input
              id="media-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-2 w-full rounded-md border border-gray-300 p-3 text-sm text-gray-900 shadow-sm"
            />
          </div>
          <div>
            <label htmlFor="media-alt-text" className="text-sm font-semibold text-gray-900">
              Alt text
            </label>
            <input
              id="media-alt-text"
              value={altText}
              onChange={(event) => setAltText(event.target.value)}
              className="mt-2 w-full rounded-md border border-gray-300 p-3 text-sm text-gray-900 shadow-sm"
            />
          </div>
          <div className="lg:col-span-2">
            <label htmlFor="media-tags" className="text-sm font-semibold text-gray-900">
              Tags
            </label>
            <input
              id="media-tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="hero, lifestyle, supplier"
              className="mt-2 w-full rounded-md border border-gray-300 p-3 text-sm text-gray-900 shadow-sm"
            />
          </div>
        </div>
        <button
          type="button"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          onClick={() => void handleSourceMedia()}
          className="mt-5 rounded-md bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white disabled:bg-gray-300"
        >
          {isSubmitting ? "Sourcing..." : "Source media"}
        </button>
      </section>

      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <label htmlFor="media-processing-status" className="text-sm font-semibold text-gray-900">
            Processing status
          </label>
          <select
            id="media-processing-status"
            value={status}
            onChange={(event) => setStatus(event.target.value as FilterStatus)}
            className="mt-2 block rounded-md border border-gray-300 p-2 text-sm text-gray-900 shadow-sm"
          >
            <option value="all">All statuses</option>
            <option value="sourced">Sourced</option>
            <option value="processing">Processing</option>
            <option value="processed">Processed</option>
            <option value="validated">Validated</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <p className="text-sm text-gray-600">
          Showing {filteredAssets.length} of {items.length} media assets.
        </p>
      </div>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="Media assets">
        {filteredAssets.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-sm text-gray-600 md:col-span-2 xl:col-span-3">
            No media assets found. Source media or adjust the processing status filter.
          </div>
        )}
        {filteredAssets.map((asset) => (
          <article
            key={asset.id}
            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            {asset.objectStoreLocation?.url || asset.sourceUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- Remote supplier/CDN URLs are backend-provided previews.
              <img
                src={asset.objectStoreLocation?.url ?? asset.sourceUrl}
                alt={asset.metadata.altText || assetTitle(asset)}
                className="h-44 w-full rounded-md border border-gray-200 object-cover"
              />
            ) : (
              <div className="flex h-44 items-center justify-center rounded-md border border-dashed border-gray-300 text-sm text-gray-500">
                Preview pending
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusBadge
                label={mediaReviewStateLabel(asset.reviewState ?? "pending")}
                tone={mediaReviewStateTone(asset.reviewState ?? "pending")}
              />
              <StatusBadge
                label={mediaProcessStateLabel(asset.processState ?? "pending")}
                tone={mediaProcessStateTone(asset.processState ?? "pending")}
              />
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
            <p className="mt-1 text-sm text-gray-600">{asset.originalFilename}</p>
            <p className="mt-2 text-sm text-gray-700">
              {asset.metadata.altText || "Alt text missing"}
            </p>
            {asset.qaResult?.checks.map((check) => (
              <p key={`${asset.id}-${check.code}`} className="mt-2 text-xs text-gray-600">
                {check.message}
              </p>
            ))}
            <button
              type="button"
              onClick={() => selectAsset(asset)}
              aria-label={`Edit ${assetTitle(asset)}`}
              className="mt-4 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800"
            >
              Edit metadata
            </button>
          </article>
        ))}
      </section>

      {selected && (
        <section
          aria-label="Metadata editor"
          className="mt-8 rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-xl font-semibold">Metadata editor</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="editor-media-title" className="text-sm font-semibold text-gray-900">
                Title
              </label>
              <input
                id="editor-media-title"
                value={editorTitle}
                onChange={(event) => setEditorTitle(event.target.value)}
                className="mt-2 w-full rounded-md border border-gray-300 p-3 text-sm text-gray-900 shadow-sm"
              />
            </div>
            <div>
              <label
                htmlFor="editor-media-alt-text"
                className="text-sm font-semibold text-gray-900"
              >
                Alt text
              </label>
              <input
                id="editor-media-alt-text"
                value={editorAltText}
                onChange={(event) => setEditorAltText(event.target.value)}
                className="mt-2 w-full rounded-md border border-gray-300 p-3 text-sm text-gray-900 shadow-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="editor-media-tags" className="text-sm font-semibold text-gray-900">
                Tags
              </label>
              <input
                id="editor-media-tags"
                value={editorTags}
                onChange={(event) => setEditorTags(event.target.value)}
                className="mt-2 w-full rounded-md border border-gray-300 p-3 text-sm text-gray-900 shadow-sm"
              />
            </div>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => void handleSaveMetadata()}
            className="mt-5 rounded-md bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white disabled:bg-gray-300"
          >
            Save metadata
          </button>
        </section>
      )}
    </main>
  );
}
