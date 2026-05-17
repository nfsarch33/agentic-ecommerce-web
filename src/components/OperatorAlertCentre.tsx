"use client";

// File scope: v3.9.1 EC-9-5 operator alert centre client component.
//
// Polls /api/operator-alerts (BFF -> backend) every 10s and renders
// per-alert cards with acknowledge/resolve actions. The plan calls
// for an SSE feed re-using the v3.6.0 pattern; a follow-up sprint
// can swap polling for the SSE stream once the backend exposes a
// /api/v1/operator/alerts/stream endpoint. The current pattern keeps
// the Vitest harness deterministic without a EventSource polyfill.

import { useEffect, useState, useMemo } from "react";
import {
  alertSeverityToneClass,
  alertTypeLabel,
  parseAlertList,
  type AlertStatus,
  type OperatorAlert,
} from "@/lib/domain/operator-alerts";

export interface OperatorAlertCentreProps {
  readonly tenantId?: string;
  readonly status?: AlertStatus;
  readonly intervalMs?: number;
  readonly fetchImpl?: typeof fetch;
}

type Phase = "loading" | "ready" | "error";

interface CentreData {
  readonly alerts: readonly OperatorAlert[];
  readonly errorMessage?: string;
}

export function OperatorAlertCentre({
  tenantId,
  status = "pending",
  intervalMs = 10_000,
  fetchImpl,
}: OperatorAlertCentreProps) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [data, setData] = useState<CentreData>({ alerts: [] });

  const fetcher = useMemo(
    () => fetchImpl ?? (typeof fetch !== "undefined" ? fetch : undefined),
    [fetchImpl],
  );

  useEffect(() => {
    if (!fetcher) {
      setPhase("error");
      setData({ alerts: [], errorMessage: "fetch unavailable" });
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      try {
        const params = new URLSearchParams();
        params.set("status", status);
        if (tenantId) params.set("tenant_id", tenantId);
        const response = await fetcher!(`/api/operator-alerts?${params.toString()}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const body = (await response.json()) as Record<string, unknown>;
        const alerts = parseAlertList(body);
        if (cancelled) return;
        setData({ alerts });
        setPhase("ready");
      } catch (err) {
        if (cancelled) return;
        setPhase("error");
        setData({ alerts: [], errorMessage: err instanceof Error ? err.message : "unknown" });
      }
      if (!cancelled) {
        timer = setTimeout(poll, intervalMs);
      }
    }
    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [fetcher, status, tenantId, intervalMs]);

  async function actOnAlert(alert: OperatorAlert, action: "acknowledge" | "approve" | "deny"): Promise<void> {
    if (!fetcher) return;
    const params = new URLSearchParams();
    if (alert.tenantId) params.set("tenant_id", alert.tenantId);
    const path =
      action === "acknowledge"
        ? `/api/operator-alerts/${alert.alertId}/acknowledge?${params.toString()}`
        : `/api/operator-alerts/${alert.alertId}/resolve?action=${action}&${params.toString()}`;
    try {
      const response = await fetcher(path, { method: "POST" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      // Optimistic update: drop the alert from the local list when the
      // status leaves the currently-viewed bucket. The next poll will
      // re-sync against the backend either way.
      setData((prev) => ({ alerts: prev.alerts.filter((a) => a.alertId !== alert.alertId) }));
    } catch (err) {
      setData((prev) => ({ ...prev, errorMessage: err instanceof Error ? err.message : "unknown" }));
    }
  }

  if (phase === "loading") {
    return (
      <section data-testid="operator-alerts-loading" className="rounded-md border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
        Loading operator alerts...
      </section>
    );
  }
  if (phase === "error") {
    return (
      <section data-testid="operator-alerts-error" className="rounded-md border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">
        Failed to load operator alerts: {data.errorMessage ?? "unknown"}
      </section>
    );
  }

  if (data.alerts.length === 0) {
    return (
      <section data-testid="operator-alerts-empty" className="rounded-md border border-gray-200 bg-white p-4 text-sm text-gray-600">
        No {status} operator alerts.
      </section>
    );
  }

  return (
    <section data-testid="operator-alerts-list" className="space-y-3">
      {data.errorMessage ? (
        <div
          data-testid="operator-alerts-error"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          Failed to update operator alert: {data.errorMessage}
        </div>
      ) : null}
      <header className="flex items-baseline justify-between rounded-md border border-gray-200 bg-white p-3 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">
          Operator alerts ({data.alerts.length})
        </h2>
        <span className="text-xs uppercase tracking-wide text-gray-500">{status}</span>
      </header>
      <ul role="list" className="space-y-2">
        {data.alerts.map((alert) => (
          <li
            key={alert.alertId}
            data-testid={`operator-alert-${alert.alertId}`}
            className="flex flex-wrap items-center gap-3 rounded-md border border-gray-200 bg-white p-3 shadow-sm"
          >
            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${alertSeverityToneClass(alert.severity)}`}>
              {alert.severity}
            </span>
            <span className="text-sm font-medium text-gray-900">{alertTypeLabel(alert.alertType)}</span>
            <code className="text-xs text-gray-500">{alert.alertId}</code>
            <span className="ml-auto flex gap-2">
              {alert.status === "pending" ? (
                <button
                  type="button"
                  data-testid={`operator-alert-ack-${alert.alertId}`}
                  onClick={() => void actOnAlert(alert, "acknowledge")}
                  className="rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
                >
                  Acknowledge
                </button>
              ) : null}
              <button
                type="button"
                data-testid={`operator-alert-approve-${alert.alertId}`}
                onClick={() => void actOnAlert(alert, "approve")}
                className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700"
              >
                Approve
              </button>
              <button
                type="button"
                data-testid={`operator-alert-deny-${alert.alertId}`}
                onClick={() => void actOnAlert(alert, "deny")}
                className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
              >
                Deny
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
