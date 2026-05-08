"use client";

import { useState } from "react";
import Link from "next/link";
import type { Tenant } from "@/lib/domain/tenant";
import { canActivateTenant, canArchiveTenant, canSuspendTenant } from "@/lib/domain/tenant";
import { TenantStatusPill } from "./TenantStatusPill";
import {
  activateTenantUsecase,
  archiveTenantUsecase,
  suspendTenantUsecase,
} from "@/lib/usecases/provision-tenant";

export interface TenantManagementProps {
  readonly tenants: readonly Tenant[];
  readonly baseUrl: string;
}

export function TenantManagement({ tenants, baseUrl }: TenantManagementProps) {
  const [items, setItems] = useState<readonly Tenant[]>(tenants);
  const [busyID, setBusyID] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function replace(updated: Tenant): void {
    setItems((current) => current.map((t) => (t.id === updated.id ? updated : t)));
  }

  async function transition(t: Tenant, action: "activate" | "suspend" | "archive"): Promise<void> {
    setError(null);
    setBusyID(t.id);
    const opts = { baseUrl, id: t.id };
    const result =
      action === "activate"
        ? await activateTenantUsecase(opts)
        : action === "suspend"
          ? await suspendTenantUsecase(opts)
          : await archiveTenantUsecase(opts);
    setBusyID(null);
    if (result.ok) replace(result.tenant);
    else setError(result.error);
  }

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Tenants</h1>
        <Link
          href="/admin/tenants/new"
          className="inline-flex rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
          data-testid="tenants-new-button"
        >
          Provision tenant
        </Link>
      </header>
      {error ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800" data-testid="tenants-error">
          {error}
        </p>
      ) : null}
      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500" data-testid="tenants-empty">
          No tenants provisioned yet.
        </p>
      ) : (
        <table className="min-w-full divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-600">Slug</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-600">Name</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-600">Plan</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-600">Status</th>
              <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.map((t) => (
              <tr key={t.id} data-testid={`tenant-row-${t.id}`}>
                <td className="px-3 py-2 text-sm">
                  <Link href={`/admin/tenants/${t.id}`} className="text-slate-900 hover:underline">
                    {t.slug}
                  </Link>
                </td>
                <td className="px-3 py-2 text-sm">{t.name}</td>
                <td className="px-3 py-2 text-sm">{t.plan}</td>
                <td className="px-3 py-2 text-sm">
                  <TenantStatusPill status={t.status} />
                </td>
                <td className="space-x-2 px-3 py-2 text-right text-sm">
                  {canActivateTenant(t.status) ? (
                    <button
                      type="button"
                      onClick={() => transition(t, "activate")}
                      disabled={busyID === t.id}
                      data-testid={`tenant-action-activate-${t.id}`}
                      className="inline-flex rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Activate
                    </button>
                  ) : null}
                  {canSuspendTenant(t.status) ? (
                    <button
                      type="button"
                      onClick={() => transition(t, "suspend")}
                      disabled={busyID === t.id}
                      data-testid={`tenant-action-suspend-${t.id}`}
                      className="inline-flex rounded-md bg-amber-500 px-2 py-1 text-xs font-medium text-white hover:bg-amber-600 disabled:opacity-50"
                    >
                      Suspend
                    </button>
                  ) : null}
                  {canArchiveTenant(t.status) ? (
                    <button
                      type="button"
                      onClick={() => transition(t, "archive")}
                      disabled={busyID === t.id}
                      data-testid={`tenant-action-archive-${t.id}`}
                      className="inline-flex rounded-md bg-rose-600 px-2 py-1 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                    >
                      Archive
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
