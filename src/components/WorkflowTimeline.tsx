"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  reviewSignalLabel,
  workflowStatusLabel,
  workflowStatusTone,
  type ReviewSignal,
  type WorkflowActivity,
  type WorkflowDetail,
} from "@/lib/domain/workflow";
import {
  sendReviewSignalForWorkflow,
  type SendReviewSignalForWorkflowInput,
} from "@/lib/usecases/workflows";

export interface WorkflowTimelineProps {
  readonly workflow: WorkflowDetail;
  readonly apiBaseUrl: string;
  readonly sendReviewSignalImpl?: (
    input: SendReviewSignalForWorkflowInput,
  ) => Promise<WorkflowDetail>;
}

const reviewSignals: readonly ReviewSignal[] = ["approve", "reject", "request_changes"];

function statusBadgeClasses(status: WorkflowDetail["status"]): string {
  switch (workflowStatusTone(status)) {
    case "blue":
      return "bg-blue-50 text-blue-700 ring-blue-200";
    case "amber":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "green":
      return "bg-green-50 text-green-700 ring-green-200";
    case "red":
      return "bg-red-50 text-red-700 ring-red-200";
    case "gray":
      return "bg-gray-50 text-gray-700 ring-gray-200";
  }
}

function activityMarkerClasses(status: WorkflowActivity["status"]): string {
  switch (status) {
    case "completed":
      return "bg-green-600";
    case "failed":
      return "bg-red-600";
    case "waiting_review":
      return "bg-amber-500";
    case "running":
      return "bg-blue-600";
    case "pending":
    case "skipped":
      return "bg-gray-300";
  }
}

function formatTimestamp(iso?: string): string {
  if (!iso) return "Not recorded";
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(iso));
}

function titleForWorkflow(workflow: WorkflowDetail): string {
  return workflow.productTitle ? `${workflow.productTitle} workflow` : `Workflow ${workflow.id}`;
}

export function WorkflowTimeline({
  workflow,
  apiBaseUrl,
  sendReviewSignalImpl = sendReviewSignalForWorkflow,
}: WorkflowTimelineProps) {
  const [activeWorkflow, setActiveWorkflow] = useState(workflow);
  const [note, setNote] = useState("");
  const [isSending, setIsSending] = useState<ReviewSignal | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canSignal = activeWorkflow.status === "waiting_review";

  useEffect(() => {
    setActiveWorkflow(workflow);
  }, [workflow]);

  async function sendSignal(signal: ReviewSignal): Promise<void> {
    setMessage(null);
    setError(null);
    setIsSending(signal);
    try {
      const updatedWorkflow = await sendReviewSignalImpl({
        baseUrl: apiBaseUrl,
        workflowId: activeWorkflow.id,
        signal,
        note: note.trim() || undefined,
      });
      setActiveWorkflow(updatedWorkflow);
      setNote("");
      setMessage(`Sent ${reviewSignalLabel(signal).toLowerCase()} signal.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send review signal.");
    } finally {
      setIsSending(null);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <nav className="mb-6">
        <Link href="/admin/workflows" className="text-sm text-blue-600 hover:underline">
          &larr; Back to workflows
        </Link>
      </nav>

      <header className="mb-8 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
              Product publish
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {titleForWorkflow(activeWorkflow)}
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Product ID <span className="font-mono">{activeWorkflow.productId}</span>
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset ${statusBadgeClasses(
              activeWorkflow.status,
            )}`}
          >
            {workflowStatusLabel(activeWorkflow.status)}
          </span>
        </div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Started</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {formatTimestamp(activeWorkflow.startedAt)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Updated</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {formatTimestamp(activeWorkflow.updatedAt)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Current activity
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {activeWorkflow.currentActivity ?? "None"}
            </dd>
          </div>
        </dl>
      </header>

      {(message || error) && (
        <div
          role={error ? "alert" : "status"}
          className={`mb-6 rounded-md border p-4 text-sm ${
            error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-700"
          }`}
        >
          {error ?? message}
        </div>
      )}

      <section
        className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
        aria-label="Activity timeline"
      >
        <h2 className="text-xl font-semibold">Activity timeline</h2>
        <ol className="mt-5 space-y-5">
          {activeWorkflow.activities.map((activity) => (
            <li key={activity.id} className="relative pl-8">
              <span
                className={`absolute left-0 top-1.5 h-3 w-3 rounded-full ${activityMarkerClasses(activity.status)}`}
                aria-hidden="true"
              />
              <div className="rounded-md border border-gray-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="font-medium text-gray-950">{activity.name}</h3>
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    {activity.status.replace(/_/g, " ")}
                  </span>
                </div>
                {activity.message && (
                  <p className="mt-2 text-sm text-gray-700">{activity.message}</p>
                )}
                {activity.error && <p className="mt-2 text-sm text-red-700">{activity.error}</p>}
                <p className="mt-3 text-xs text-gray-500">
                  Started {formatTimestamp(activity.startedAt)}
                  {activity.completedAt
                    ? ` - Completed ${formatTimestamp(activity.completedAt)}`
                    : ""}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section
        className="mt-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
        aria-label="Human review"
      >
        <h2 className="text-xl font-semibold">Human review signal</h2>
        {canSignal ? (
          <>
            <label htmlFor="review-note" className="mt-4 block text-sm font-medium text-gray-900">
              Review note
            </label>
            <textarea
              id="review-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              className="mt-2 w-full rounded-md border border-gray-300 p-3 text-sm text-gray-900 shadow-sm focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20"
            />
            <div className="mt-4 flex flex-wrap gap-3">
              {reviewSignals.map((signal) => (
                <button
                  key={signal}
                  type="button"
                  disabled={isSending !== null}
                  onClick={() => void sendSignal(signal)}
                  className="cursor-pointer rounded-md bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-[var(--color-brand-700)] disabled:cursor-wait disabled:bg-gray-300"
                >
                  {isSending === signal ? "Sending..." : reviewSignalLabel(signal)}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-3 text-sm text-gray-600">
            Review signals are available when the workflow is waiting for human review.
          </p>
        )}
      </section>
    </main>
  );
}
