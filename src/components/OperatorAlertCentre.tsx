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
type QueueStatus = Exclude<AlertStatus, "expired">;

interface CentreData {
  readonly alertsByStatus: Record<QueueStatus, readonly OperatorAlert[]>;
  readonly errorMessage?: string;
}

const QUEUE_STATUSES: readonly QueueStatus[] = ["pending", "acknowledged", "resolved"];

function emptyAlertCollections(): Record<QueueStatus, readonly OperatorAlert[]> {
  return {
    pending: [],
    acknowledged: [],
    resolved: [],
  };
}

function buildAlertPath(status: QueueStatus, tenantId?: string): string {
  const params = new URLSearchParams();
  params.set("status", status);
  if (tenantId) params.set("tenant_id", tenantId);
  return `/api/operator-alerts?${params.toString()}`;
}

async function loadAlertQueues(
  fetcher: typeof fetch,
  tenantId?: string,
): Promise<Record<QueueStatus, readonly OperatorAlert[]>> {
  const responses = await Promise.all(
    QUEUE_STATUSES.map(async (queueStatus) => {
      const response = await fetcher(buildAlertPath(queueStatus, tenantId));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = (await response.json()) as Record<string, unknown>;
      return [queueStatus, parseAlertList(body)] as const;
    }),
  );

  const next = emptyAlertCollections();
  for (const [queueStatus, alerts] of responses) {
    next[queueStatus] = alerts;
  }
  return next;
}

function queueSummary(
  data: Record<QueueStatus, readonly OperatorAlert[]>,
): Record<QueueStatus, number> {
  return {
    pending: data.pending.length,
    acknowledged: data.acknowledged.length,
    resolved: data.resolved.length,
  };
}

function queueStatusFromMutation(raw: unknown): QueueStatus | null {
  if (raw === "pending" || raw === "acknowledged" || raw === "resolved") {
    return raw;
  }
  return null;
}

function normalizeQueueStatus(status: AlertStatus): QueueStatus {
  return status === "expired" ? "pending" : status;
}

function mergeAlertOutcome(alert: OperatorAlert, raw: Record<string, unknown>): OperatorAlert {
  const nextStatus = queueStatusFromMutation(raw.status) ?? alert.status;
  return {
    ...alert,
    tenantId:
      typeof raw.tenant_id === "string" && raw.tenant_id.length > 0
        ? raw.tenant_id
        : alert.tenantId,
    alertId:
      typeof raw.alert_id === "string" && raw.alert_id.length > 0 ? raw.alert_id : alert.alertId,
    status: nextStatus,
    actionTaken:
      typeof raw.action_taken === "string" && raw.action_taken.length > 0
        ? raw.action_taken
        : alert.actionTaken,
    acknowledgedAt:
      typeof raw.acknowledged_at === "string" && raw.acknowledged_at.length > 0
        ? raw.acknowledged_at
        : alert.acknowledgedAt,
    resolvedAt:
      typeof raw.resolved_at === "string" && raw.resolved_at.length > 0
        ? raw.resolved_at
        : alert.resolvedAt,
  };
}

export function OperatorAlertCentre({
  tenantId,
  status = "pending",
  intervalMs = 10_000,
  fetchImpl,
}: OperatorAlertCentreProps) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [activeStatus, setActiveStatus] = useState<QueueStatus>(normalizeQueueStatus(status));
  const [data, setData] = useState<CentreData>({ alertsByStatus: emptyAlertCollections() });

  const fetcher = useMemo(
    () => fetchImpl ?? (typeof fetch !== "undefined" ? fetch : undefined),
    [fetchImpl],
  );

  useEffect(() => {
    setActiveStatus(normalizeQueueStatus(status));
  }, [status]);

  useEffect(() => {
    if (!fetcher) {
      setPhase("error");
      setData({ alertsByStatus: emptyAlertCollections(), errorMessage: "fetch unavailable" });
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      try {
        const alertsByStatus = await loadAlertQueues(fetcher!, tenantId);
        if (cancelled) return;
        setData({ alertsByStatus });
        setPhase("ready");
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "unknown";
        setData((prev) => ({
          alertsByStatus: prev.alertsByStatus,
          errorMessage: message,
        }));
        setPhase((prev) => (prev === "loading" ? "error" : "ready"));
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
  }, [fetcher, tenantId, intervalMs]);

  async function actOnAlert(
    alert: OperatorAlert,
    action: "acknowledge" | "approve" | "deny",
  ): Promise<void> {
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
      const body = (await response.json()) as Record<string, unknown>;
      const nextAlert = mergeAlertOutcome(alert, body);
      const nextStatus = queueStatusFromMutation(body.status) ?? activeStatus;
      setActiveStatus(nextStatus);
      setData((prev) => {
        const nextAlertsByStatus = emptyAlertCollections();
        for (const queueStatus of QUEUE_STATUSES) {
          nextAlertsByStatus[queueStatus] = prev.alertsByStatus[queueStatus].filter(
            (item) => item.alertId !== alert.alertId,
          );
        }
        nextAlertsByStatus[nextStatus] = [nextAlert, ...nextAlertsByStatus[nextStatus]];
        return { alertsByStatus: nextAlertsByStatus };
      });
    } catch (err) {
      setData((prev) => ({
        ...prev,
        errorMessage: err instanceof Error ? err.message : "unknown",
      }));
    }
  }

  const summary = queueSummary(data.alertsByStatus);
  const alerts = data.alertsByStatus[activeStatus];

  if (phase === "loading") {
    return (
      <section
        data-testid="operator-alerts-loading"
        className="rounded-md border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500"
      >
        Loading operator alerts...
      </section>
    );
  }
  if (phase === "error") {
    return (
      <section
        data-testid="operator-alerts-error"
        className="rounded-md border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700"
      >
        Failed to load operator alerts: {data.errorMessage ?? "unknown"}
      </section>
    );
  }

  return (
    <section data-testid="operator-alerts-shell" className="space-y-4">
      <section data-testid="operator-alert-summaries" className="grid gap-3 md:grid-cols-3">
        {QUEUE_STATUSES.map((queueStatus) => (
          <button
            key={queueStatus}
            type="button"
            data-testid={`operator-alert-queue-${queueStatus}`}
            onClick={() => setActiveStatus(queueStatus)}
            className={`rounded-md border px-4 py-3 text-left shadow-sm ${
              queueStatus === activeStatus
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-200 bg-white text-gray-900"
            }`}
          >
            <span className="block text-xs uppercase tracking-wide opacity-80">{queueStatus}</span>
            <strong
              data-testid={`operator-alert-summary-${queueStatus}`}
              className="mt-2 block text-2xl font-semibold"
            >
              {summary[queueStatus]}
            </strong>
          </button>
        ))}
      </section>
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
            Operator alerts ({alerts.length})
          </h2>
          <span
            data-testid="operator-alert-queue-active"
            className="text-xs uppercase tracking-wide text-gray-500"
          >
            {activeStatus}
          </span>
        </header>
        {alerts.length === 0 ? (
          <section
            data-testid="operator-alerts-empty"
            className="rounded-md border border-gray-200 bg-white p-4 text-sm text-gray-600"
          >
            No {activeStatus} operator alerts.
          </section>
        ) : (
          <ul role="list" className="space-y-2">
            {alerts.map((alert) => (
              <li
                key={alert.alertId}
                data-testid={`operator-alert-${alert.alertId}`}
                className="flex flex-wrap items-center gap-3 rounded-md border border-gray-200 bg-white p-3 shadow-sm"
              >
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${alertSeverityToneClass(alert.severity)}`}
                >
                  {alert.severity}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {alertTypeLabel(alert.alertType)}
                </span>
                <code className="text-xs text-gray-500">{alert.alertId}</code>
                <div className="w-full space-y-1 text-xs text-gray-500">
                  <div>
                    Created at <time dateTime={alert.createdAt}>{alert.createdAt}</time>
                  </div>
                  {alert.acknowledgedAt ? (
                    <div data-testid={`operator-alert-acknowledged-at-${alert.alertId}`}>
                      Acknowledged at{" "}
                      <time dateTime={alert.acknowledgedAt}>{alert.acknowledgedAt}</time>
                    </div>
                  ) : null}
                  {alert.resolvedAt ? (
                    <div data-testid={`operator-alert-resolved-at-${alert.alertId}`}>
                      Resolved at <time dateTime={alert.resolvedAt}>{alert.resolvedAt}</time>
                    </div>
                  ) : null}
                </div>
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
                  {alert.status === "acknowledged" ? (
                    <>
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
                    </>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
