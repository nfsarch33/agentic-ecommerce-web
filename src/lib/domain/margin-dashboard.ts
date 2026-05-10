// File scope: v3.9.0 EC-6-5 margin dashboard domain types.
//
// Mirrors the backend handler.MarginDashboardSnapshot / MarginAlert
// / MarginForecast envelopes (see
// internal/api/handler/analytics_margin.go). Kept in src/lib/domain/
// alongside the other domain types so the admin pages + tests
// share a single canonical shape.

export interface MarginDashboardSnapshot {
  readonly revenueAUDCents: number;
  readonly supplierCostAUDCents: number;
  readonly shippingCostAUDCents: number;
  readonly platformFeesAUDCents: number;
  readonly netMarginAUDCents: number;
  readonly netMarginPct: number;
  readonly roiPct: number;
  readonly orderCount: number;
  readonly competitorAvgAUDCents: number;
  readonly competitorPositioning: "above" | "below" | "parity" | "unknown";
}

export type MarginAlertSeverity = "info" | "warning" | "critical" | "unknown";

export interface MarginAlert {
  readonly productId: string;
  readonly channel: string;
  readonly severity: MarginAlertSeverity;
  readonly reason: string;
  readonly deltaPct: number;
  readonly createdAt: string;
}

export interface MarginForecast {
  readonly forecastAUDCents: number;
  readonly lowerBoundAUDCents: number;
  readonly upperBoundAUDCents: number;
  readonly confidencePct: number;
  readonly basedOnDays: number;
}

export interface MarginDashboardEnvelope {
  readonly tenantId: string;
  readonly from: string;
  readonly to: string;
  readonly channel: string;
  readonly dashboard: MarginDashboardSnapshot;
}

// formatAUDCents renders an integer cents value as the operator-
// facing AUD string. Pure function; tested separately so the
// component body stays small.
export function formatAUDCents(cents: number): string {
  if (!Number.isFinite(cents)) return "$0.00";
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

// formatPct renders a [0, 1] ratio as a percentage string with one
// decimal place. Pure function.
export function formatPct(ratio: number): string {
  if (!Number.isFinite(ratio)) return "0.0%";
  return `${(ratio * 100).toFixed(1)}%`;
}

// alertSeverityToneClass maps the closed-enum severity to a
// Tailwind colour token. Pure function so the component body stays
// small + the mapping is testable in isolation.
export function alertSeverityToneClass(severity: MarginAlertSeverity): string {
  switch (severity) {
    case "critical":
      return "bg-red-50 text-red-700";
    case "warning":
      return "bg-amber-50 text-amber-700";
    case "info":
      return "bg-blue-50 text-blue-700";
    case "unknown":
    default:
      return "bg-gray-100 text-gray-700";
  }
}

// parseMarginEnvelope decodes the canonical JSON envelope into the
// domain shape. Returns undefined on malformed payloads so the
// caller can render the empty/error state.
export function parseMarginEnvelope(raw: unknown): MarginDashboardEnvelope | undefined {
  if (!isRecord(raw)) return undefined;
  const dashboard = raw["dashboard"];
  if (!isRecord(dashboard)) return undefined;
  return {
    tenantId: String(raw["tenant_id"] ?? ""),
    from: String(raw["from"] ?? ""),
    to: String(raw["to"] ?? ""),
    channel: String(raw["channel"] ?? ""),
    dashboard: {
      revenueAUDCents: numberOr(dashboard["revenue_aud_cents"], 0),
      supplierCostAUDCents: numberOr(dashboard["supplier_cost_aud_cents"], 0),
      shippingCostAUDCents: numberOr(dashboard["shipping_cost_aud_cents"], 0),
      platformFeesAUDCents: numberOr(dashboard["platform_fees_aud_cents"], 0),
      netMarginAUDCents: numberOr(dashboard["net_margin_aud_cents"], 0),
      netMarginPct: numberOr(dashboard["net_margin_pct"], 0),
      roiPct: numberOr(dashboard["roi_pct"], 0),
      orderCount: numberOr(dashboard["order_count"], 0),
      competitorAvgAUDCents: numberOr(dashboard["competitor_avg_aud_cents"], 0),
      competitorPositioning: normalisePositioning(dashboard["competitor_positioning"]),
    },
  };
}

export function parseMarginAlerts(raw: unknown): readonly MarginAlert[] {
  if (!isRecord(raw)) return [];
  const alerts = raw["alerts"];
  if (!Array.isArray(alerts)) return [];
  const out: MarginAlert[] = [];
  for (const alert of alerts) {
    if (!isRecord(alert)) continue;
    out.push({
      productId: String(alert["product_id"] ?? ""),
      channel: String(alert["channel"] ?? ""),
      severity: normaliseSeverity(alert["severity"]),
      reason: String(alert["reason"] ?? ""),
      deltaPct: numberOr(alert["delta_pct"], 0),
      createdAt: String(alert["created_at"] ?? ""),
    });
  }
  return out;
}

export function parseMarginForecast(raw: unknown): MarginForecast | undefined {
  if (!isRecord(raw)) return undefined;
  return {
    forecastAUDCents: numberOr(raw["forecast_aud_cents"], 0),
    lowerBoundAUDCents: numberOr(raw["lower_bound_aud_cents"], 0),
    upperBoundAUDCents: numberOr(raw["upper_bound_aud_cents"], 0),
    confidencePct: numberOr(raw["confidence_pct"], 0),
    basedOnDays: numberOr(raw["based_on_days"], 0),
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function numberOr(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const parsed = Number(v);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function normaliseSeverity(raw: unknown): MarginAlertSeverity {
  if (raw === "info" || raw === "warning" || raw === "critical") return raw;
  return "unknown";
}

function normalisePositioning(raw: unknown): MarginDashboardSnapshot["competitorPositioning"] {
  if (raw === "above" || raw === "below" || raw === "parity") return raw;
  return "unknown";
}
