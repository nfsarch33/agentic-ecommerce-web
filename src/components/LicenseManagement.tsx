"use client";

import { useState } from "react";
import type { License } from "@/lib/domain/digital";
import { canRevoke, IllegalLicenseTransitionError } from "@/lib/domain/digital";
import type { Role } from "@/lib/domain/auth";
import { LicenseStatusPill } from "./LicenseStatusPill";
import { revokeLicenseUsecase } from "@/lib/usecases/revoke-license";

export interface LicenseManagementProps {
  readonly initialLicenses: ReadonlyArray<License>;
  readonly userRole: Role;
  readonly tenantId: string;
  readonly baseUrl: string;
  readonly error?: string;
}

export function LicenseManagement({
  initialLicenses,
  userRole,
  tenantId,
  baseUrl,
  error,
}: LicenseManagementProps) {
  const [licenses, setLicenses] = useState<readonly License[]>(initialLicenses);
  const [actionError, setActionError] = useState<string | null>(null);
  const canMutate = userRole === "operator" || userRole === "admin";

  if (licenses.length === 0) {
    return (
      <section data-testid="licenses-empty" className="rounded border border-dashed border-gray-300 p-6 text-sm text-gray-600">
        <h2 className="text-lg font-semibold">No licences yet</h2>
        <p className="mt-1">Issue a licence from a digital product page to populate this list.</p>
        {error ? (
          <p data-testid="licenses-error" className="mt-2 text-rose-700">
            {error}
          </p>
        ) : null}
      </section>
    );
  }

  const onRevoke = async (lic: License) => {
    try {
      const updated = await revokeLicenseUsecase({ baseUrl, tenantId, license: lic });
      setLicenses((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      setActionError(null);
    } catch (err) {
      if (err instanceof IllegalLicenseTransitionError) {
        setActionError(`Cannot revoke licence in state ${err.from}`);
      } else if (err instanceof Error) {
        setActionError(err.message);
      } else {
        setActionError("revoke failed");
      }
    }
  };

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Licences</h2>
      </header>
      {actionError ? (
        <p data-testid="licenses-action-error" className="text-sm text-rose-700">
          {actionError}
        </p>
      ) : null}
      <table className="w-full table-fixed border-collapse text-sm">
        <thead>
          <tr className="text-left text-gray-600">
            <th className="w-1/4 py-1">Key</th>
            <th className="w-1/4 py-1">Customer</th>
            <th className="w-1/6 py-1">State</th>
            <th className="w-1/6 py-1">Issued</th>
            <th className="w-1/6 py-1 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {licenses.map((lic) => (
            <tr key={lic.id} data-testid={`license-row-${lic.id}`} className="border-t border-gray-200">
              <td className="py-1 font-mono text-xs">{lic.key}</td>
              <td className="py-1 font-mono text-xs">{lic.customerId}</td>
              <td className="py-1">
                <LicenseStatusPill state={lic.state} />
              </td>
              <td className="py-1">{lic.issuedAt}</td>
              <td className="py-1 text-right">
                {canMutate && canRevoke(lic.state) ? (
                  <button
                    type="button"
                    onClick={() => void onRevoke(lic)}
                    data-testid={`license-action-revoke-${lic.id}`}
                    className="rounded bg-rose-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-rose-700"
                  >
                    Revoke
                  </button>
                ) : (
                  <span className="text-xs text-gray-400">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
