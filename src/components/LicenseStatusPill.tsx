import type { LicenseState } from "@/lib/domain/digital";
import { licenseStateLabel, licenseStateTone } from "@/lib/domain/digital";

const TONE_STYLES = {
  ok: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  warn: "bg-amber-50 text-amber-800 ring-amber-600/20",
  danger: "bg-rose-50 text-rose-800 ring-rose-600/20",
} as const;

export interface LicenseStatusPillProps {
  readonly state: LicenseState;
  readonly className?: string;
}

export function LicenseStatusPill({ state, className }: LicenseStatusPillProps) {
  const tone = licenseStateTone(state);
  return (
    <span
      role="status"
      aria-label={`License state ${licenseStateLabel(state)}`}
      data-testid={`license-status-${state}`}
      className={[
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        TONE_STYLES[tone],
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {licenseStateLabel(state)}
    </span>
  );
}
