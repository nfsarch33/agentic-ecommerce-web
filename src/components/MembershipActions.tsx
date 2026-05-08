"use client";
import type { Subscription } from "@/lib/domain/membership";
import { availableActions } from "@/lib/domain/membership";

export type MembershipAction = "pause" | "resume" | "cancel";

export interface MembershipActionsProps {
  readonly membership: Subscription;
  readonly onAction: (action: MembershipAction) => void;
  readonly busyAction?: MembershipAction;
  readonly disabled?: boolean;
}

const LABELS: Record<MembershipAction, string> = {
  pause: "Pause",
  resume: "Resume",
  cancel: "Cancel",
};

const STYLES: Record<MembershipAction, string> = {
  pause: "bg-amber-100 text-amber-900 hover:bg-amber-200 disabled:opacity-50",
  resume: "bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50",
  cancel: "bg-rose-100 text-rose-900 hover:bg-rose-200 disabled:opacity-50",
};

export function MembershipActions({ membership, onAction, busyAction, disabled }: MembershipActionsProps) {
  const allowed = availableActions(membership.state).filter(
    (a): a is MembershipAction => a === "pause" || a === "resume" || a === "cancel",
  );

  if (allowed.length === 0) {
    return (
      <p className="text-sm text-gray-500" data-testid="membership-actions-none">
        No actions available in {membership.state} state.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Membership actions">
      {allowed.map((action) => {
        const isBusy = busyAction === action;
        return (
          <button
            key={action}
            type="button"
            onClick={() => onAction(action)}
            disabled={disabled || isBusy}
            data-testid={`membership-action-${action}`}
            className={[
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              STYLES[action],
            ].join(" ")}
          >
            {isBusy ? `${LABELS[action]}…` : LABELS[action]}
          </button>
        );
      })}
    </div>
  );
}
