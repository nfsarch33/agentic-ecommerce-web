"use client";

import { useRouter } from "next/navigation";
import type { MarketplaceSubmission } from "@/lib/adapters/api/marketplace-submissions";
import { SubmissionReviewActions } from "@/components/SubmissionReviewActions";
import { SubmissionStatusPill } from "@/components/SubmissionStatusPill";

export interface SubmissionReviewClientProps {
  readonly submission: MarketplaceSubmission;
}

export function SubmissionReviewClient({ submission }: SubmissionReviewClientProps) {
  const router = useRouter();

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
    router.refresh();
    return { ok: true as const };
  }

  const isTerminal = submission.state !== "pending_review";

  return (
    <div data-testid="submission-review-client" className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <SubmissionStatusPill state={submission.state} />
        <span className="text-sm text-gray-500">
          {submission.reviewer ? `Reviewed by ${submission.reviewer}` : `Submitted by ${submission.submitterEmail}`}
        </span>
      </div>
      <SubmissionReviewActions
        submissionId={submission.id}
        disabled={isTerminal}
        onApprove={(id, notes) => callApi("approve", id, notes)}
        onReject={(id, notes) => callApi("reject", id, notes)}
      />
    </div>
  );
}
