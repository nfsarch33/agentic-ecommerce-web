import type { MembershipState } from "@/lib/domain/membership";
import { stateLabel, stateTone } from "@/lib/domain/membership";

const TONE_STYLES = {
  info: "bg-blue-50 text-blue-800 ring-blue-600/20",
  success: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  warning: "bg-amber-50 text-amber-800 ring-amber-600/20",
  danger: "bg-rose-50 text-rose-800 ring-rose-600/20",
  muted: "bg-gray-50 text-gray-700 ring-gray-600/20",
} as const;

export interface MembershipStatusPillProps {
  readonly state: MembershipState;
  readonly className?: string;
}

export function MembershipStatusPill({ state, className }: MembershipStatusPillProps) {
  const tone = stateTone(state);
  return (
    <span
      role="status"
      aria-label={`Membership state ${stateLabel(state)}`}
      data-testid={`membership-status-${state}`}
      className={[
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        TONE_STYLES[tone],
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {stateLabel(state)}
    </span>
  );
}
