import { seoScoreLabel, type SeoScore } from "@/lib/domain/compliance";

export interface SeoScoreBreakdownProps {
  readonly score?: SeoScore;
}

const dimensions: Array<readonly [keyof SeoScore["breakdown"], string]> = [
  ["title", "Title"],
  ["metaDescription", "Meta description"],
  ["slug", "Slug"],
  ["keywordDensity", "Keyword density"],
  ["imageAltText", "Image alt text"],
];

export function SeoScoreBreakdown({ score }: SeoScoreBreakdownProps) {
  if (!score) {
    return (
      <section aria-label="SEO score breakdown" className="rounded-lg border border-dashed border-gray-300 p-4">
        <h3 className="text-lg font-semibold">SEO score</h3>
        <p className="mt-2 text-sm text-gray-600">Run compliance to load an SEO score for this product.</p>
      </section>
    );
  }

  return (
    <section aria-label="SEO score breakdown" className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">SEO score</h3>
          <p className="mt-1 text-sm text-gray-600">{seoScoreLabel(score)}</p>
        </div>
        <p className="text-3xl font-semibold text-green-700">{score.overall}/100</p>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-5">
        {dimensions.map(([key, label]) => (
          <div key={key} className="rounded-md bg-gray-50 p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
            <dd className="mt-1 text-lg font-semibold text-gray-900">{score.breakdown[key]}</dd>
          </div>
        ))}
      </dl>

      {score.recommendations.length > 0 && (
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-gray-600">
          {score.recommendations.map((recommendation) => (
            <li key={recommendation}>{recommendation}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
