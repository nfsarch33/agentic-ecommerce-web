"use client";

import { useState } from "react";

export interface ApiVersionToggleProps {
  readonly v1SpecUrl: string;
  readonly v2SpecUrl: string;
  readonly initialVersion?: "v1" | "v2";
}

/**
 * ApiVersionToggle is a light client-side switch between the v1 stable
 * and v2 preview API surfaces. The v2 panel adds an explicit
 * "preview" badge so visitors do not mistake it for a stable contract.
 */
export function ApiVersionToggle({
  v1SpecUrl,
  v2SpecUrl,
  initialVersion = "v1",
}: ApiVersionToggleProps) {
  const [version, setVersion] = useState<"v1" | "v2">(initialVersion);
  return (
    <div data-testid="api-version-toggle" className="flex flex-col gap-3">
      <div role="radiogroup" aria-label="API version" className="inline-flex gap-2">
        <button
          type="button"
          role="radio"
          aria-checked={version === "v1"}
          data-testid="api-version-v1"
          onClick={() => setVersion("v1")}
          className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
            version === "v1"
              ? "border-blue-500 bg-blue-500 text-white"
              : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
          }`}
        >
          v1 stable
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={version === "v2"}
          data-testid="api-version-v2"
          onClick={() => setVersion("v2")}
          className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
            version === "v2"
              ? "border-amber-500 bg-amber-500 text-white"
              : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
          }`}
        >
          v2 preview
        </button>
      </div>
      <div
        data-testid={`api-version-panel-${version}`}
        className={`rounded-md border p-3 text-sm ${
          version === "v1"
            ? "border-blue-200 bg-blue-50 text-blue-900"
            : "border-amber-200 bg-amber-50 text-amber-900"
        }`}
      >
        {version === "v1" ? (
          <>
            <p>
              <strong>v1 stable.</strong> No breaking changes through host v3.x. New
              optional fields may be added; clients that ignore unknown fields stay
              compatible. Spec:{" "}
            </p>
            <a
              data-testid="api-version-spec-link"
              className="break-all text-blue-700 underline"
              href={v1SpecUrl}
              target="_blank"
              rel="noreferrer noopener"
            >
              {v1SpecUrl}
            </a>
          </>
        ) : (
          <>
            <p>
              <strong>v2 preview.</strong> Schemas, paths, and verbs may change between
              minor releases. Opt in by hitting <code>/api/v2/...</code> directly or by
              setting the Accept header to <code>application/vnd.ec.v2+json</code>.
              Every v2 response carries <code>X-API-Deprecation: preview</code>. Spec:{" "}
            </p>
            <a
              data-testid="api-version-spec-link"
              className="break-all text-amber-800 underline"
              href={v2SpecUrl}
              target="_blank"
              rel="noreferrer noopener"
            >
              {v2SpecUrl}
            </a>
          </>
        )}
      </div>
    </div>
  );
}
