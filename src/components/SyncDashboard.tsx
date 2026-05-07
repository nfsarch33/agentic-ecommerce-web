"use client";

import { useState } from "react";
import {
  resolveSyncConflict,
  type ResolveSyncConflictOptions,
} from "@/lib/adapters/api/sync";
import {
  countOpenConflicts,
  isSyncHealthy,
  type SyncConflict,
  type SyncConflictResolution,
  type SyncStatus,
} from "@/lib/domain/sync";
import { useSyncStatusPolling } from "@/lib/hooks/use-sync-status-polling";

export interface SyncDashboardProps {
  readonly apiBaseUrl: string;
  readonly initialStatus: SyncStatus;
  readonly initialConflicts: readonly SyncConflict[];
  readonly resolveConflictImpl?: (opts: ResolveSyncConflictOptions) => Promise<SyncConflict>;
}

function formatTimestamp(value?: string): string {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatValue(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value, null, 2);
}

export function SyncDashboard({
  apiBaseUrl,
  initialStatus,
  initialConflicts,
  resolveConflictImpl = resolveSyncConflict,
}: SyncDashboardProps) {
  const { status, error, isPolling } = useSyncStatusPolling({
    apiBaseUrl,
    initialStatus,
  });
  const [conflicts, setConflicts] = useState<readonly SyncConflict[]>(initialConflicts);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingConflictId, setPendingConflictId] = useState<string | null>(null);

  async function resolveConflict(conflictId: string, resolution: SyncConflictResolution): Promise<void> {
    setPendingConflictId(conflictId);
    setActionError(null);
    try {
      const updated = await resolveConflictImpl({
        baseUrl: apiBaseUrl,
        conflictId,
        resolution,
      });
      setConflicts((current) => current.map((conflict) => (conflict.id === updated.id ? updated : conflict)));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to resolve conflict.");
    } finally {
      setPendingConflictId(null);
    }
  }

  const healthy = isSyncHealthy(status);
  const openConflicts = countOpenConflicts(conflicts);
  const stateLabel = status.lastError ? "failed" : healthy ? "idle" : "degraded";

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8">
        <p className="text-sm font-medium uppercase tracking-wide text-gray-500">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Sync Dashboard</h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          Monitor WooCommerce bidirectional sync health and clear manual review conflicts. Real-time SSE is pending
          backend support, so this dashboard refreshes status by polling.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-4" aria-label="Sync status metrics">
        <article className="rounded-lg border border-gray-200 p-4 shadow-sm">
          <h2 className="text-sm font-medium text-gray-500">State</h2>
          <p className={`mt-2 text-2xl font-semibold ${healthy ? "text-green-700" : "text-amber-700"}`}>
            {stateLabel}
          </p>
          <p className="mt-1 text-xs text-gray-500">{isPolling ? "Refreshing..." : "Polling every 5s"}</p>
        </article>
        <article className="rounded-lg border border-gray-200 p-4 shadow-sm">
          <h2 className="text-sm font-medium text-gray-500">Last event</h2>
          <p className="mt-2 text-2xl font-semibold">{status.lastEvent?.type ?? "none"}</p>
          <p className="mt-1 text-xs text-gray-500">Updated {formatTimestamp(status.updatedAt)}</p>
        </article>
        <article className="rounded-lg border border-gray-200 p-4 shadow-sm">
          <h2 className="text-sm font-medium text-gray-500">Events</h2>
          <p className="mt-2 text-2xl font-semibold">{status.totalEvents}</p>
          <p className="mt-1 text-xs text-gray-500">Recorded sync events</p>
        </article>
        <article className="rounded-lg border border-gray-200 p-4 shadow-sm">
          <h2 className="text-sm font-medium text-gray-500">Conflicts</h2>
          <p className="mt-2 text-2xl font-semibold">{openConflicts}</p>
          <p className="mt-1 text-xs text-gray-500">{status.pendingConflicts} pending in backend</p>
        </article>
      </section>

      {(error || actionError || status.lastError) && (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          {actionError ?? error ?? status.lastError}
        </div>
      )}

      <section className="mt-8 rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-5">
          <h2 className="text-xl font-semibold">Conflict Review Queue</h2>
          <p className="mt-1 text-sm text-gray-600">
            Last backend update: {formatTimestamp(status.updatedAt)}. SSE follow-up is tracked for v0.4.0.
          </p>
        </div>

        {conflicts.length === 0 ? (
          <p className="p-6 text-sm text-gray-600">No sync conflicts need manual review.</p>
        ) : (
          <div className="divide-y divide-gray-200">
            {conflicts.map((conflict) => (
              <article key={conflict.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
                      Product {conflict.sku} / WooCommerce #{conflict.remoteId}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold">{conflict.fields.length} divergent fields</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Detected {formatTimestamp(conflict.createdAt)}. Status: {conflict.status}
                    </p>
                  </div>
                  {conflict.resolution && (
                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                      {conflict.resolution}
                    </span>
                  )}
                </div>

                <div className="mt-5 space-y-4">
                  {conflict.fields.map((field) => (
                    <section key={field.field} className="rounded-md border border-gray-200 p-4">
                      <h4 className="text-sm font-semibold text-gray-900">{field.field}</h4>
                      <div className="mt-3 grid gap-4 md:grid-cols-2">
                        <div className="rounded border border-blue-200 bg-blue-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-blue-900">Local value</p>
                          <pre className="mt-2 whitespace-pre-wrap break-words rounded bg-white p-3 text-sm text-gray-900">
                            {formatValue(field.localValue)}
                          </pre>
                        </div>
                        <div className="rounded border border-purple-200 bg-purple-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-purple-900">
                            WooCommerce value
                          </p>
                          <pre className="mt-2 whitespace-pre-wrap break-words rounded bg-white p-3 text-sm text-gray-900">
                            {formatValue(field.remoteValue)}
                          </pre>
                        </div>
                      </div>
                    </section>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={pendingConflictId === conflict.id}
                    onClick={() => void resolveConflict(conflict.id, "local")}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-wait disabled:bg-gray-300"
                  >
                    Use local
                  </button>
                  <button
                    type="button"
                    disabled={pendingConflictId === conflict.id}
                    onClick={() => void resolveConflict(conflict.id, "remote")}
                    className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:cursor-wait disabled:bg-gray-300"
                  >
                    Use WooCommerce
                  </button>
                  <button
                    type="button"
                    disabled={pendingConflictId === conflict.id}
                    onClick={() => void resolveConflict(conflict.id, "manual")}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:cursor-wait disabled:bg-gray-100"
                  >
                    Mark manual
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
