import type { SubmissionState } from "@/lib/adapters/api/marketplace-submissions";

const PILL_COLORS: Record<SubmissionState, string> = {
  pending_review: "bg-yellow-100 text-yellow-900 border-yellow-300",
  approved: "bg-green-100 text-green-900 border-green-300",
  rejected: "bg-red-100 text-red-900 border-red-300",
};

const PILL_LABELS: Record<SubmissionState, string> = {
  pending_review: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
};

export interface SubmissionStatusPillProps {
  readonly state: SubmissionState;
}

export function SubmissionStatusPill({ state }: SubmissionStatusPillProps) {
  return (
    <span
      data-testid="submission-status-pill"
      data-state={state}
      className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${PILL_COLORS[state]}`}
    >
      {PILL_LABELS[state]}
    </span>
  );
}
