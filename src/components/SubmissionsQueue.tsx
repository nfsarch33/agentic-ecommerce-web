import Link from "next/link";
import type { MarketplaceSubmission } from "@/lib/adapters/api/marketplace-submissions";
import { SubmissionStatusPill } from "@/components/SubmissionStatusPill";

export interface SubmissionsQueueProps {
  readonly submissions: readonly MarketplaceSubmission[];
  readonly total: number;
  readonly error?: string;
}

export function SubmissionsQueue({ submissions, total, error }: SubmissionsQueueProps) {
  return (
    <main data-testid="submissions-queue" className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Marketplace plugin submissions</h1>
        <span data-testid="submissions-total" className="text-sm text-gray-500">
          {total} pending
        </span>
      </header>
      {error && (
        <p data-testid="submissions-queue-error" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      <table className="w-full border-separate border-spacing-y-2 text-sm">
        <thead>
          <tr className="text-left text-xs uppercase text-gray-500">
            <th className="px-2">Slug</th>
            <th className="px-2">Vendor</th>
            <th className="px-2">Tenant</th>
            <th className="px-2">Submitted</th>
            <th className="px-2">Status</th>
            <th className="px-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((row) => (
            <tr key={row.id} data-testid={`submission-row-${row.id}`} className="rounded border bg-white shadow-sm">
              <td className="px-2 py-2 font-mono">{row.manifest.slug}</td>
              <td className="px-2 py-2">{row.manifest.vendor}</td>
              <td className="px-2 py-2 font-mono">{row.tenantId}</td>
              <td className="px-2 py-2 text-gray-600">{row.submittedAt}</td>
              <td className="px-2 py-2"><SubmissionStatusPill state={row.state} /></td>
              <td className="px-2 py-2">
                <Link
                  href={`/admin/marketplace/submissions/${encodeURIComponent(row.id)}`}
                  className="text-blue-600 underline"
                  data-testid={`submission-row-link-${row.id}`}
                >
                  Review
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {submissions.length === 0 && !error && (
        <p data-testid="submissions-empty" className="text-sm text-gray-500">
          No pending submissions.
        </p>
      )}
    </main>
  );
}
