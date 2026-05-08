import type { InstallationState } from "@/lib/domain/marketplace";
import { installationStateLabel, installationStateTone } from "@/lib/domain/marketplace";

const TONE_STYLES = {
  neutral: "bg-slate-50 text-slate-700 ring-slate-600/20",
  ok: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  warn: "bg-amber-50 text-amber-800 ring-amber-600/20",
  danger: "bg-rose-50 text-rose-800 ring-rose-600/20",
} as const;

export interface InstallationStatusPillProps {
  readonly state: InstallationState;
  readonly className?: string;
}

export function InstallationStatusPill({ state, className }: InstallationStatusPillProps) {
  const tone = installationStateTone(state);
  return (
    <span
      role="status"
      aria-label={`Installation state ${installationStateLabel(state)}`}
      data-testid={`installation-status-${state}`}
      className={[
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        TONE_STYLES[tone],
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {installationStateLabel(state)}
    </span>
  );
}
