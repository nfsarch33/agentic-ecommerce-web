// File scope: v3.9.1 EC-9-5 -- operator alert centre typed envelopes.
//
// Wraps the backend GET /api/v1/operator/alerts response so the
// component renders strongly-typed alerts without parsing maps in
// React land.

export type AlertStatus = "pending" | "acknowledged" | "resolved" | "expired";
export type AlertSeverity = "info" | "warning" | "critical";

export type AlertType =
  | "large_refund_pending_approval"
  | "large_dropship_pending_approval"
  | "price_change_pending_approval"
  | "captcha_detected"
  | "omniparser_unavailable"
  | "rate_limit_drain"
  | "channel_status_update_failed"
  | "large_margin_alert";

export interface OperatorAlert {
  readonly tenantId: string;
  readonly alertId: string;
  readonly alertType: AlertType;
  readonly severity: AlertSeverity;
  readonly status: AlertStatus;
  readonly payload?: Record<string, unknown>;
  readonly actionTaken?: string;
  readonly createdAt: string;
  readonly acknowledgedAt?: string;
  readonly resolvedAt?: string;
  readonly expiresAt: string;
}

const ALERT_TYPES: ReadonlySet<AlertType> = new Set<AlertType>([
  "large_refund_pending_approval",
  "large_dropship_pending_approval",
  "price_change_pending_approval",
  "captcha_detected",
  "omniparser_unavailable",
  "rate_limit_drain",
  "channel_status_update_failed",
  "large_margin_alert",
]);

const ALERT_STATUSES: ReadonlySet<AlertStatus> = new Set<AlertStatus>([
  "pending",
  "acknowledged",
  "resolved",
  "expired",
]);

const ALERT_SEVERITIES: ReadonlySet<AlertSeverity> = new Set<AlertSeverity>([
  "info",
  "warning",
  "critical",
]);

export function parseAlertList(raw: unknown): readonly OperatorAlert[] {
  if (!isRecord(raw)) return [];
  const list = raw["alerts"];
  if (!Array.isArray(list)) return [];
  return list
    .map(parseAlert)
    .filter((a): a is OperatorAlert => a !== null);
}

function parseAlert(raw: unknown): OperatorAlert | null {
  if (!isRecord(raw)) return null;
  const alertType = stringField(raw, "alert_type");
  const status = stringField(raw, "status");
  const severity = stringField(raw, "severity");
  if (!alertType || !ALERT_TYPES.has(alertType as AlertType)) return null;
  if (!ALERT_STATUSES.has(status as AlertStatus)) return null;
  return {
    tenantId: stringField(raw, "tenant_id"),
    alertId: stringField(raw, "alert_id"),
    alertType: alertType as AlertType,
    severity: ALERT_SEVERITIES.has(severity as AlertSeverity)
      ? (severity as AlertSeverity)
      : "warning",
    status: status as AlertStatus,
    payload: isRecord(raw["payload"]) ? raw["payload"] : undefined,
    actionTaken: optionalString(raw, "action_taken"),
    createdAt: stringField(raw, "created_at"),
    acknowledgedAt: optionalString(raw, "acknowledged_at"),
    resolvedAt: optionalString(raw, "resolved_at"),
    expiresAt: stringField(raw, "expires_at"),
  };
}

export function alertSeverityToneClass(severity: AlertSeverity): string {
  switch (severity) {
    case "critical":
      return "bg-red-100 text-red-800";
    case "warning":
      return "bg-amber-100 text-amber-800";
    case "info":
      return "bg-sky-100 text-sky-800";
  }
}

export function alertTypeLabel(type: AlertType): string {
  switch (type) {
    case "large_refund_pending_approval":
      return "Large refund pending approval";
    case "large_dropship_pending_approval":
      return "Large drop-ship pending approval";
    case "price_change_pending_approval":
      return "Price change pending approval";
    case "captcha_detected":
      return "CAPTCHA detected";
    case "omniparser_unavailable":
      return "OmniParser unavailable";
    case "rate_limit_drain":
      return "Rate-limit drain";
    case "channel_status_update_failed":
      return "Channel status update failed";
    case "large_margin_alert":
      return "Large margin alert";
  }
}

function stringField(raw: Record<string, unknown>, key: string): string {
  const v = raw[key];
  return typeof v === "string" ? v : "";
}

function optionalString(raw: Record<string, unknown>, key: string): string | undefined {
  const v = raw[key];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
