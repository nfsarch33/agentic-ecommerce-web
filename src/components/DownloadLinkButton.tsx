"use client";

import { useState } from "react";
import type { License } from "@/lib/domain/digital";
import { issueDownloadUsecase } from "@/lib/usecases/issue-download";

export interface DownloadLinkButtonProps {
  readonly license: License;
  readonly baseUrl: string;
  readonly tenantId: string;
}

export function DownloadLinkButton({ license, baseUrl, tenantId }: DownloadLinkButtonProps) {
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [url, setUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const onClick = async () => {
    setState("loading");
    setMessage(null);
    try {
      const out = await issueDownloadUsecase({ baseUrl, tenantId, license });
      setUrl(out.url);
      setState("ready");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "download failed";
      setMessage(msg);
      setState("error");
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={state === "loading"}
        data-testid={`license-download-${license.id}`}
        className="rounded bg-emerald-600 px-3 py-1 text-sm font-medium text-white hover:bg-emerald-700 disabled:bg-gray-300"
      >
        {state === "loading" ? "Minting URL..." : "Download"}
      </button>
      {state === "ready" && url ? (
        <a
          href={url}
          data-testid={`license-download-link-${license.id}`}
          className="text-xs text-emerald-700 underline"
          rel="noopener noreferrer"
        >
          Tap to download (link expires soon)
        </a>
      ) : null}
      {state === "error" && message ? (
        <span data-testid={`license-download-error-${license.id}`} className="text-xs text-rose-700">
          {message}
        </span>
      ) : null}
    </div>
  );
}
