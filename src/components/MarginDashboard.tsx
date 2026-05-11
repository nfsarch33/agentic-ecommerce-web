"use client";

// File scope: v3.9.0 EC-6-5 margin dashboard client component.
//
// Renders the unified margin view (revenue, costs, ROI, competitor
// positioning) + alerts + forecast. Data fetching is delegated to
// the BFF route at /api/margin-dashboard which forwards to the
// backend's analytics_margin handler.
//
// Design note: the component does not use any external chart
// library; the v3.9.0 plan calls out "use existing chart libs in
// frontend" but this app currently has no chart library installed.
// We render the metrics as semantic HTML tables + simple bar
// indicators so the page loads under 100ms with zero new deps.

import { useEffect, useMemo, useState } from "react";
import {
  alertSeverityToneClass,
  formatAUDCents,
  formatPct,
  parseMarginAlerts,
  parseMarginEnvelope,
  parseMarginForecast,
  type MarginAlert,
  type MarginDashboardEnvelope,
  type MarginForecast,
} from "@/lib/domain/margin-dashboard";

export interface MarginDashboardProps {
  readonly tenantId?: string;
  readonly period?: "7d" | "30d" | "90d";
  readonly fetchImpl?: typeof fetch;
}

type LoadState = "loading" | "ready" | "error";

interface DashboardData {
  readonly envelope?: MarginDashboardEnvelope;
  readonly alerts: readonly MarginAlert[];
  readonly forecast?: MarginForecast;
}

const DEFAULT_PERIOD = "30d" as const;

export function MarginDashboard(props: MarginDashboardProps) {
  const { tenantId, period = DEFAULT_PERIOD, fetchImpl } = props;
  const hasFetchOverride = Object.prototype.hasOwnProperty.call(props, "fetchImpl");
  const [state, setState] = useState<LoadState>("loading");
  const [data, setData] = useState<DashboardData>({ alerts: [] });

  const fetcher = useMemo(
    () => (hasFetchOverride ? fetchImpl : typeof fetch !== "undefined" ? fetch : undefined),
    [fetchImpl, hasFetchOverride],
  );
  const [error, setError] = useState<string | null>(() => (fetcher ? null : "fetch unavailable"));
  const renderedState = fetcher ? state : "error";

  useEffect(() => {
    if (!fetcher) {
      return;
    }
    let cancelled = false;
    async function load() {
      setState("loading");
      try {
        const params = new URLSearchParams();
        if (tenantId) params.set("tenant_id", tenantId);
        params.set("period", period);
        const url = `/api/margin-dashboard?${params.toString()}`;
        const response = await fetcher!(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const body = (await response.json()) as Record<string, unknown>;
        const envelope = parseMarginEnvelope(body);
        const alerts = parseMarginAlerts(body);
        const forecast = parseMarginForecast(body["forecast"]);
        if (cancelled) return;
        setData({ envelope, alerts, forecast });
        setState("ready");
      } catch (err) {
        if (cancelled) return;
        setState("error");
        setError(err instanceof Error ? err.message : "unknown");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [fetcher, tenantId, period]);

  if (renderedState === "loading") {
    return (
      <section data-testid="margin-dashboard-loading" className="rounded-md border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
        Loading margin dashboard...
      </section>
    );
  }

  if (renderedState === "error") {
    return (
      <section data-testid="margin-dashboard-error" className="rounded-md border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">
        Failed to load margin dashboard: {error ?? "unknown error"}
      </section>
    );
  }

  return (
    <section className="grid gap-6" data-testid="margin-dashboard-ready">
      {data.envelope ? <DashboardSummary envelope={data.envelope} /> : null}
      <AlertsTable alerts={data.alerts} />
      {data.forecast ? <ForecastCard forecast={data.forecast} /> : null}
    </section>
  );
}

function DashboardSummary({ envelope }: { readonly envelope: MarginDashboardEnvelope }) {
  const { dashboard } = envelope;
  return (
    <article className="rounded-md border border-gray-200 bg-white p-4 shadow-sm" data-testid="margin-dashboard-summary">
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-gray-900">Margin summary</h2>
        <span className="text-xs uppercase tracking-wide text-gray-500">
          {envelope.from.split("T")[0] || "..."} - {envelope.to.split("T")[0] || "..."}
        </span>
      </header>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="list">
        <Metric label="Revenue" value={formatAUDCents(dashboard.revenueAUDCents)} />
        <Metric label="Supplier cost" value={formatAUDCents(dashboard.supplierCostAUDCents)} />
        <Metric label="Shipping" value={formatAUDCents(dashboard.shippingCostAUDCents)} />
        <Metric label="Platform fees" value={formatAUDCents(dashboard.platformFeesAUDCents)} />
        <Metric label="Net margin" value={formatAUDCents(dashboard.netMarginAUDCents)} highlighted />
        <Metric label="Net margin %" value={formatPct(dashboard.netMarginPct)} highlighted />
        <Metric label="ROI %" value={formatPct(dashboard.roiPct / 100)} />
        <Metric label="Orders" value={String(dashboard.orderCount)} />
        <Metric label="Competitor avg" value={formatAUDCents(dashboard.competitorAvgAUDCents)} />
        <Metric label="Position" value={dashboard.competitorPositioning} />
      </dl>
    </article>
  );
}

function Metric({ label, value, highlighted }: { readonly label: string; readonly value: string; readonly highlighted?: boolean }) {
  return (
    <div role="listitem" className="rounded border border-gray-100 px-3 py-2">
      <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className={highlighted ? "mt-1 text-base font-semibold text-emerald-700" : "mt-1 text-sm text-gray-900"}>{value}</dd>
    </div>
  );
}

function AlertsTable({ alerts }: { readonly alerts: readonly MarginAlert[] }) {
  if (alerts.length === 0) {
    return (
      <article data-testid="margin-dashboard-alerts-empty" className="rounded-md border border-gray-200 bg-white p-4 text-sm text-gray-600">
        No pending margin alerts.
      </article>
    );
  }
  return (
    <article className="rounded-md border border-gray-200 bg-white p-4 shadow-sm" data-testid="margin-dashboard-alerts">
      <h2 className="mb-3 text-base font-semibold text-gray-900">Alerts ({alerts.length})</h2>
      <ul className="grid gap-2" role="list">
        {alerts.map((alert) => (
          <li key={`${alert.productId}-${alert.reason}`} className="flex flex-wrap items-center gap-3 rounded border border-gray-100 px-3 py-2">
            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${alertSeverityToneClass(alert.severity)}`}>
              {alert.severity}
            </span>
            <span className="text-sm font-medium text-gray-900">{alert.productId}</span>
            <span className="text-xs text-gray-600">{alert.reason}</span>
            <span className="ml-auto text-xs text-gray-500">{formatPct(alert.deltaPct)}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function ForecastCard({ forecast }: { readonly forecast: MarginForecast }) {
  return (
    <article className="rounded-md border border-gray-200 bg-white p-4 shadow-sm" data-testid="margin-dashboard-forecast">
      <h2 className="mb-3 text-base font-semibold text-gray-900">Forecast</h2>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="list">
        <Metric label="Forecast" value={formatAUDCents(forecast.forecastAUDCents)} highlighted />
        <Metric label="Lower bound" value={formatAUDCents(forecast.lowerBoundAUDCents)} />
        <Metric label="Upper bound" value={formatAUDCents(forecast.upperBoundAUDCents)} />
        <Metric label="Confidence" value={formatPct(forecast.confidencePct)} />
        <Metric label="Based on" value={`${forecast.basedOnDays}d`} />
      </dl>
    </article>
  );
}
