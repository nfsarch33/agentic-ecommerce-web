import Link from "next/link";
import {
  workflowStatusLabel,
  workflowStatusTone,
  type WorkflowStatusCounts,
  type WorkflowSummary,
} from "@/lib/domain/workflow";

export interface WorkflowStatusListProps {
  readonly workflows: readonly WorkflowSummary[];
  readonly counts: WorkflowStatusCounts;
}

const groups = [
  {
    key: "running",
    title: "Running",
    ariaLabel: "Running workflows",
    matches: (workflow: WorkflowSummary) =>
      workflow.status === "queued" ||
      workflow.status === "running" ||
      workflow.status === "waiting_review",
  },
  {
    key: "completed",
    title: "Completed",
    ariaLabel: "Completed workflows",
    matches: (workflow: WorkflowSummary) => workflow.status === "completed",
  },
  {
    key: "failed",
    title: "Failed",
    ariaLabel: "Failed workflows",
    matches: (workflow: WorkflowSummary) => workflow.status === "failed",
  },
] as const;

function toneClasses(status: WorkflowSummary["status"]): string {
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

function workflowTitle(workflow: WorkflowSummary): string {
  return workflow.productTitle ?? workflow.productId;
}

function formatTimestamp(iso: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export function WorkflowStatusList({ workflows, counts }: WorkflowStatusListProps) {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8">
        <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
          Temporal workflows
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Workflow Status</h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          Track product publish workflows from draft review through compliance checks, media
          validation, and WooCommerce publishing.
        </p>
      </header>

      <dl className="mb-8 grid gap-4 sm:grid-cols-3" aria-label="Workflow status summary">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <dt className="text-sm font-medium text-gray-500">Running</dt>
          <dd className="mt-1 text-3xl font-semibold text-blue-700">{counts.running}</dd>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <dt className="text-sm font-medium text-gray-500">Completed</dt>
          <dd className="mt-1 text-3xl font-semibold text-green-700">{counts.completed}</dd>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <dt className="text-sm font-medium text-gray-500">Failed</dt>
          <dd className="mt-1 text-3xl font-semibold text-red-700">{counts.failed}</dd>
        </div>
      </dl>

      {workflows.length === 0 ? (
        <section className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
          <h2 className="text-lg font-semibold text-gray-900">No workflows yet</h2>
          <p className="mt-2 text-sm text-gray-600">
            Publish workflows will appear here once an operator starts one from the product content
            page.
          </p>
        </section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {groups.map((group) => {
            const items = workflows.filter(group.matches);
            return (
              <section
                key={group.key}
                aria-label={group.ariaLabel}
                className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
              >
                <h2 className="text-lg font-semibold text-gray-900">{group.title}</h2>
                {items.length === 0 ? (
                  <p className="mt-4 text-sm text-gray-500">
                    No {group.title.toLowerCase()} workflows.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {items.map((workflow) => (
                      <li key={workflow.id} className="rounded-md border border-gray-200 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <Link
                            href={`/admin/workflows/${workflow.id}`}
                            className="font-medium text-gray-950 hover:text-[var(--color-brand-700)]"
                          >
                            {workflowTitle(workflow)}
                          </Link>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${toneClasses(
                              workflow.status,
                            )}`}
                          >
                            {workflowStatusLabel(workflow.status)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-gray-600">
                          {workflow.currentActivity ?? "Product publish workflow"}
                        </p>
                        {workflow.error && (
                          <p className="mt-2 rounded-md bg-red-50 p-2 text-sm text-red-700">
                            {workflow.error}
                          </p>
                        )}
                        <p className="mt-3 text-xs text-gray-500">
                          Updated {formatTimestamp(workflow.updatedAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
