import type { TenantStatus } from "@/lib/domain/tenant";
import { tenantStatusLabel, tenantStatusTone } from "@/lib/domain/tenant";

const TONE_STYLES = {
  neutral: "bg-slate-50 text-slate-700 ring-slate-600/20",
  ok: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  warn: "bg-amber-50 text-amber-800 ring-amber-600/20",
  danger: "bg-rose-50 text-rose-800 ring-rose-600/20",
} as const;

export interface TenantStatusPillProps {
  readonly status: TenantStatus;
  readonly className?: string;
}

export function TenantStatusPill({ status, className }: TenantStatusPillProps) {
  const tone = tenantStatusTone(status);
  return (
    <span
      role="status"
      aria-label={`Tenant status ${tenantStatusLabel(status)}`}
      data-testid={`tenant-status-${status}`}
      className={[
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        TONE_STYLES[tone],
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {tenantStatusLabel(status)}
    </span>
  );
}
