"use client";

import { useEffect, useState } from "react";
import { fetchSyncStatus, type FetchSyncStatusOptions } from "@/lib/adapters/api/sync";
import type { SyncStatus } from "@/lib/domain/sync";

export interface UseSyncStatusPollingInput {
  readonly apiBaseUrl: string;
  readonly initialStatus: SyncStatus;
  readonly intervalMs?: number;
  readonly fetchStatusImpl?: (opts: FetchSyncStatusOptions) => Promise<SyncStatus>;
}

export interface UseSyncStatusPollingResult {
  readonly status: SyncStatus;
  readonly error: string | null;
  readonly isPolling: boolean;
}

export function useSyncStatusPolling({
  apiBaseUrl,
  initialStatus,
  intervalMs = 5000,
  fetchStatusImpl = fetchSyncStatus,
}: UseSyncStatusPollingInput): UseSyncStatusPollingResult {
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    let stopped = false;
    let inFlight = false;

    async function poll(): Promise<void> {
      if (inFlight) return;
      inFlight = true;
      setIsPolling(true);
      try {
        const nextStatus = await fetchStatusImpl({ baseUrl: apiBaseUrl });
        if (!stopped) {
          setStatus(nextStatus);
          setError(null);
        }
      } catch (err) {
        if (!stopped) {
          setError(err instanceof Error ? err.message : "Unable to refresh sync status.");
        }
      } finally {
        inFlight = false;
        if (!stopped) setIsPolling(false);
      }
    }

    const timer = window.setInterval(() => {
      void poll();
    }, intervalMs);

    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [apiBaseUrl, fetchStatusImpl, intervalMs]);

  return { status, error, isPolling };
}
