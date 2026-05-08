"use client";

import { useState } from "react";

export interface LicenseKeyDisplayProps {
  readonly licenseKey: string;
  readonly clipboard?: { writeText: (text: string) => Promise<void> };
}

export function LicenseKeyDisplay({ licenseKey, clipboard }: LicenseKeyDisplayProps) {
  const [copied, setCopied] = useState(false);
  const board = clipboard ?? (typeof navigator !== "undefined" ? navigator.clipboard : undefined);
  return (
    <div className="flex items-center gap-2 rounded border border-gray-200 bg-gray-50 px-2 py-1 font-mono text-sm">
      <span data-testid="license-key" className="select-all">
        {licenseKey}
      </span>
      {board ? (
        <button
          type="button"
          onClick={async () => {
            try {
              await board.writeText(licenseKey);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              setCopied(false);
            }
          }}
          data-testid="license-key-copy"
          className="rounded border border-gray-300 bg-white px-2 py-0.5 text-xs hover:bg-gray-100"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      ) : null}
    </div>
  );
}
