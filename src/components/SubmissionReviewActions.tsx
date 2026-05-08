"use client";

import { useState, useTransition } from "react";

export interface SubmissionReviewActionsProps {
  readonly submissionId: string;
  readonly disabled?: boolean;
  readonly onApprove: (id: string, notes: string) => Promise<{ ok: boolean; error?: string }>;
  readonly onReject: (id: string, notes: string) => Promise<{ ok: boolean; error?: string }>;
}

type ActionState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "ok"; action: "approve" | "reject" }
  | { kind: "error"; message: string };

export function SubmissionReviewActions({ submissionId, disabled, onApprove, onReject }: SubmissionReviewActionsProps) {
  const [notes, setNotes] = useState("");
  const [state, setState] = useState<ActionState>({ kind: "idle" });
  const [isPending, startTransition] = useTransition();

  function handleAction(action: "approve" | "reject") {
    setState({ kind: "submitting" });
    startTransition(() => {
      const fn = action === "approve" ? onApprove : onReject;
      void fn(submissionId, notes).then((res) => {
        if (res.ok) {
          setState({ kind: "ok", action });
        } else {
          setState({ kind: "error", message: res.error ?? "review failed" });
        }
      });
    });
  }

  const isBusy = isPending || state.kind === "submitting";

  return (
    <div data-testid="submission-review-actions" className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Review notes
        <textarea
          data-testid="review-notes"
          className="rounded border px-2 py-1 text-sm"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes for the submitter"
          disabled={disabled || isBusy}
        />
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          data-testid="approve-button"
          className="rounded bg-green-600 px-3 py-1 text-sm font-semibold text-white disabled:opacity-50"
          disabled={disabled || isBusy}
          onClick={() => handleAction("approve")}
        >
          Approve
        </button>
        <button
          type="button"
          data-testid="reject-button"
          className="rounded bg-red-600 px-3 py-1 text-sm font-semibold text-white disabled:opacity-50"
          disabled={disabled || isBusy}
          onClick={() => handleAction("reject")}
        >
          Reject
        </button>
      </div>
      {state.kind === "error" && (
        <p data-testid="review-error" className="text-sm text-red-700">
          {state.message}
        </p>
      )}
      {state.kind === "ok" && (
        <p data-testid="review-success" className="text-sm text-green-700">
          {state.action === "approve" ? "Submission approved." : "Submission rejected."}
        </p>
      )}
    </div>
  );
}
