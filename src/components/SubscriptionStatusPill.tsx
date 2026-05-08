import type { SubscriptionState } from "@/lib/domain/billing";

const TONE_STYLES = {
  trialing: "bg-sky-50 text-sky-800 ring-sky-600/20",
  active: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  past_due: "bg-amber-50 text-amber-800 ring-amber-600/20",
  paused: "bg-slate-50 text-slate-700 ring-slate-600/20",
  canceled: "bg-rose-50 text-rose-800 ring-rose-600/20",
} as const;

const LABELS: Record<SubscriptionState, string> = {
  trialing: "Trialing",
  active: "Active",
  past_due: "Past due",
  paused: "Paused",
  canceled: "Canceled",
};

export interface SubscriptionStatusPillProps {
  readonly state: SubscriptionState;
  readonly className?: string;
}

export function SubscriptionStatusPill({ state, className }: SubscriptionStatusPillProps) {
  return (
    <span
      role="status"
      aria-label={`Subscription state ${LABELS[state]}`}
      data-testid={`subscription-status-${state}`}
      className={[
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        TONE_STYLES[state],
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {LABELS[state]}
    </span>
  );
}
