"use client";

import type { License } from "@/lib/domain/digital";
import { isLicenseUsable } from "@/lib/domain/digital";
import { LicenseStatusPill } from "./LicenseStatusPill";
import { LicenseKeyDisplay } from "./LicenseKeyDisplay";
import { DownloadLinkButton } from "./DownloadLinkButton";

export interface DigitalLibraryPanelProps {
  readonly licenses: ReadonlyArray<License>;
  readonly tenantId: string;
  readonly baseUrl: string;
  readonly error?: string;
}

export function DigitalLibraryPanel({
  licenses,
  tenantId,
  baseUrl,
  error,
}: DigitalLibraryPanelProps) {
  if (licenses.length === 0) {
    return (
      <section data-testid="digital-library-empty" className="rounded border border-dashed border-gray-300 p-6 text-sm text-gray-600">
        <h2 className="text-lg font-semibold">Your library is empty</h2>
        <p className="mt-1">Purchase a digital product to start your collection.</p>
        {error ? (
          <p data-testid="digital-library-error" className="mt-2 text-rose-700">
            {error}
          </p>
        ) : null}
      </section>
    );
  }
  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold">Your digital library</h2>
        <p className="text-sm text-gray-600">
          Download links expire after 5 minutes. Generate a fresh link if needed.
        </p>
      </header>
      <ul className="space-y-3">
        {licenses.map((lic) => (
          <li
            key={lic.id}
            data-testid={`digital-library-row-${lic.id}`}
            className="rounded border border-gray-200 p-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs">{lic.productId}</span>
              <LicenseStatusPill state={lic.state} />
            </div>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <LicenseKeyDisplay licenseKey={lic.key} />
              {isLicenseUsable(lic.state) ? (
                <DownloadLinkButton license={lic} baseUrl={baseUrl} tenantId={tenantId} />
              ) : (
                <span className="text-xs text-gray-500">Download disabled (licence not active)</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
