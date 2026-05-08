import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSubmissionUsecase } from "@/lib/usecases/review-submission";
import { SubmissionReviewClient } from "@/components/SubmissionReviewClient";
import { requireServerSession } from "@/lib/server/auth-session";
import { adminPageMetadata } from "@/lib/seo-metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return adminPageMetadata({
    title: `${id} | Submission review | Agentic Ecommerce Admin`,
    description: `Review submission ${id}.`,
    canonical: `/admin/marketplace/submissions/${id}`,
  });
}

export default async function SubmissionReviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireServerSession();
  const { id } = await params;
  const baseUrl = process.env.MC_API_BASE_URL ?? "http://localhost:8080";
  const result = await getSubmissionUsecase({ baseUrl, id });
  if (!result.ok) {
    if (result.error.includes("404")) notFound();
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p data-testid="submission-error" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {result.error}
        </p>
      </main>
    );
  }
  const submission = result.submission;
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">{submission.manifest.name}</h1>
        <p className="text-sm text-gray-600">
          {submission.manifest.slug} v{submission.manifest.version} · {submission.manifest.vendor}
        </p>
      </header>
      <section data-testid="submission-detail" className="rounded border bg-white p-4 shadow-sm">
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-gray-500">Submission ID</dt>
          <dd className="font-mono">{submission.id}</dd>
          <dt className="text-gray-500">Tenant</dt>
          <dd className="font-mono">{submission.tenantId}</dd>
          <dt className="text-gray-500">Submitter</dt>
          <dd>{submission.submitterEmail}</dd>
          <dt className="text-gray-500">Submitted at</dt>
          <dd>{submission.submittedAt}</dd>
          {submission.reviewedAt && (
            <>
              <dt className="text-gray-500">Reviewed at</dt>
              <dd>{submission.reviewedAt}</dd>
            </>
          )}
          {submission.reviewNotes && (
            <>
              <dt className="text-gray-500">Review notes</dt>
              <dd>{submission.reviewNotes}</dd>
            </>
          )}
        </dl>
      </section>
      <SubmissionReviewClient submission={submission} />
    </main>
  );
}
