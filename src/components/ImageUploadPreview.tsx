"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { altTextStatus, createMediaAsset, type MediaAsset } from "@/lib/domain/compliance";

export function ImageUploadPreview() {
  const [asset, setAsset] = useState<MediaAsset | null>(null);
  const [altText, setAltText] = useState("");

  useEffect(() => {
    return () => {
      if (asset?.previewUrl) URL.revokeObjectURL(asset.previewUrl);
    };
  }, [asset?.previewUrl]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (!file) return;
    if (asset?.previewUrl) URL.revokeObjectURL(asset.previewUrl);
    const previewUrl = URL.createObjectURL(file);
    setAsset(
      createMediaAsset({
        id: `${file.name}-${file.size}`,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        previewUrl,
        altText,
      }),
    );
  }

  function handleAltTextChange(event: ChangeEvent<HTMLInputElement>): void {
    const nextAltText = event.target.value;
    setAltText(nextAltText);
    setAsset((current) =>
      current
        ? createMediaAsset({
            ...current,
            altText: nextAltText,
          })
        : current,
    );
  }

  const currentAltTextStatus = asset ? asset.altTextStatus : altTextStatus(altText);

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm" aria-label="Image upload preview">
      <h2 className="text-xl font-semibold">Image upload preview</h2>
      <p className="mt-1 text-sm text-gray-600">
        Preview product media and alt text compliance. No image has been uploaded; backend media processing is not
        wired yet.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="product-image" className="text-sm font-semibold text-gray-900">
            Product image
          </label>
          <input
            id="product-image"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="mt-2 block w-full text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-[var(--color-brand-500)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
          />
        </div>

        <div>
          <label htmlFor="image-alt-text" className="text-sm font-semibold text-gray-900">
            Alt text
          </label>
          <input
            id="image-alt-text"
            value={altText}
            onChange={handleAltTextChange}
            placeholder="Describe the visible product and context"
            className="mt-2 w-full rounded-md border border-gray-300 p-3 text-sm text-gray-900 shadow-sm focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20"
          />
          {asset && currentAltTextStatus !== "valid" ? (
            <p role="alert" className="mt-2 text-sm text-red-700">
              Add descriptive alt text before this image can pass media compliance.
            </p>
          ) : asset ? (
            <p role="status" className="mt-2 text-sm text-green-700">
              Alt text looks usable for media compliance.
            </p>
          ) : null}
        </div>
      </div>

      {asset && (
        <div className="mt-5 grid gap-4 md:grid-cols-[220px_1fr]">
          {/* eslint-disable-next-line @next/next/no-img-element -- Blob preview URLs are local-only and not handled by next/image. */}
          <img
            src={asset.previewUrl}
            alt={`Preview of ${asset.fileName}`}
            className="h-40 w-full rounded-md border border-gray-200 object-cover"
          />
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-md bg-gray-50 p-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">File</dt>
              <dd className="mt-1 font-semibold">{asset.fileName}</dd>
            </div>
            <div className="rounded-md bg-gray-50 p-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Size</dt>
              <dd className="mt-1 font-semibold">{Math.round(asset.sizeBytes / 1024)} KB</dd>
            </div>
            <div className="rounded-md bg-gray-50 p-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Optimization</dt>
              <dd className="mt-1 font-semibold">
                {asset.optimization.format}, max {asset.optimization.maxWidth}px
              </dd>
            </div>
            <div className="rounded-md bg-gray-50 p-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Upload status</dt>
              <dd className="mt-1 font-semibold">Preview only</dd>
            </div>
          </dl>
        </div>
      )}
    </section>
  );
}
