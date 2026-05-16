"use client";

import { useState } from "react";
import type { MarketplaceSubmission } from "@/lib/adapters/api/marketplace-submissions";
import { SubmissionReviewActions } from "@/components/SubmissionReviewActions";
import { SubmissionStatusPill } from "@/components/SubmissionStatusPill";

export interface SubmissionReviewClientProps {
  readonly submission: MarketplaceSubmission;
}

export function SubmissionReviewClient({ submission }: SubmissionReviewClientProps) {
  const [currentSubmission, setCurrentSubmission] = useState(submission);

  async function callApi(action: "approve" | "reject", id: string, notes: string) {
    const res = await fetch(`/api/admin/marketplace/submissions/${encodeURIComponent(id)}/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ review_notes: notes }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false as const, error: text || `${action} failed` };
    }

    try {
      const payload = (await res.json()) as { submission?: MarketplaceSubmission };
      if (!payload.submission || typeof payload.submission.id !== "string") {
        return { ok: false as const, error: `${action} returned invalid payload` };
      }
      setCurrentSubmission(payload.submission);
    } catch {
      return { ok: false as const, error: `${action} returned invalid payload` };
    }

    return { ok: true as const };
  }

  const isTerminal = currentSubmission.state !== "pending_review";

  return (
    <div data-testid="submission-review-client" className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <SubmissionStatusPill state={currentSubmission.state} />
        <span className="text-sm text-gray-500">
          {currentSubmission.reviewer
            ? `Reviewed by ${currentSubmission.reviewer}`
            : `Submitted by ${currentSubmission.submitterEmail}`}
        </span>
      </div>
      <SubmissionReviewActions
        submissionId={currentSubmission.id}
        disabled={isTerminal}
        onApprove={(id, notes) => callApi("approve", id, notes)}
        onReject={(id, notes) => callApi("reject", id, notes)}
      />
    </div>
  );
}
