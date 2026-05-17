import { summarizeFactCheckResult, type Claim, type FactCheckResult } from "@/lib/domain/fact-check";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { EvidenceSourceCard } from "./EvidenceSourceCard";

export interface ClaimEvidenceListProps {
  readonly result?: FactCheckResult;
  readonly isLoading?: boolean;
  readonly error?: string | null;
}

const verdictLabels = {
  supported: "Supported",
  unsupported: "Unsupported",
  contradicted: "Contradicted",
  ambiguous: "Ambiguous",
  insufficient_evidence: "Needs evidence",
} as const;

const verdictClasses = {
  supported: "border-green-200 bg-green-50 text-green-700",
  unsupported: "border-amber-200 bg-amber-50 text-amber-700",
  contradicted: "border-red-200 bg-red-50 text-red-700",
  ambiguous: "border-amber-200 bg-amber-50 text-amber-700",
  insufficient_evidence: "border-amber-200 bg-amber-50 text-amber-700",
} as const;

function ClaimItem({ claim }: { readonly claim: Claim }) {
  return (
    <li className="rounded-lg border border-gray-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-gray-900">{claim.text}</p>
          {claim.explanation && <p className="mt-2 text-sm text-gray-600">{claim.explanation}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${verdictClasses[claim.verdict]}`}>
            {verdictLabels[claim.verdict]}
          </span>
          <ConfidenceBadge confidence={claim.confidence} />
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {claim.evidence.length > 0 ? (
          claim.evidence.map((source) => <EvidenceSourceCard key={source.id} source={source} />)
        ) : (
          <p className="rounded-md border border-dashed border-gray-300 p-3 text-sm text-gray-600">
            No RAG evidence was returned for this claim.
          </p>
        )}
      </div>
    </li>
  );
}

export function ClaimEvidenceList({ result, isLoading = false, error = null }: ClaimEvidenceListProps) {
  if (isLoading) {
    return (
      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div role="status" className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
          Checking generated copy against RAG evidence...
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      </section>
    );
  }

  if (!result) {
    return (
      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Fact-check evidence</h2>
        <p className="mt-4 rounded-md border border-dashed border-gray-300 p-4 text-sm text-gray-600">
          Generate AI copy to see extracted claims, confidence, and RAG evidence sources.
        </p>
      </section>
    );
  }

  const summary = summarizeFactCheckResult(result);

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Fact-check evidence</h2>
          <p className="mt-1 text-sm text-gray-600">
            {summary.total} extracted claim{summary.total === 1 ? "" : "s"} checked against RAG sources.
          </p>
          {result.checkedAt && <p className="mt-1 text-sm text-gray-600">Last checked {result.checkedAt}.</p>}
        </div>
        <ConfidenceBadge confidence={result.overallConfidence} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
        <span className="rounded-full bg-green-50 px-2.5 py-1 text-green-700">{summary.supported} supported</span>
        <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700">{summary.contradicted} contradicted</span>
        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
          {summary.insufficient} need evidence
        </span>
      </div>
      {result.claims.length > 0 ? (
        <ul className="mt-5 space-y-4">
          {result.claims.map((claim) => (
            <ClaimItem key={claim.id} claim={claim} />
          ))}
        </ul>
      ) : (
        <p className="mt-5 rounded-md border border-dashed border-gray-300 p-4 text-sm text-gray-600">
          No factual claims were extracted from this generated copy.
        </p>
      )}
    </section>
  );
}
