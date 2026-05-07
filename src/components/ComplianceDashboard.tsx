"use client";

import { useMemo, useState } from "react";
import {
  checkProductCompliance,
  type CheckProductComplianceOptions,
} from "@/lib/adapters/api/compliance";
import {
  complianceResultLabel,
  complianceSummary,
  type ComplianceReportSummary,
  type ComplianceResult,
  type ComplianceRule,
  type CustomComplianceRule,
} from "@/lib/domain/compliance";
import type { ProductFields } from "@/lib/domain/product";
import { ComplianceReportingPanel } from "./ComplianceReportingPanel";
import { ImageUploadPreview } from "./ImageUploadPreview";
import { SeoScoreBreakdown } from "./SeoScoreBreakdown";

export interface ComplianceDashboardProps {
  readonly apiBaseUrl: string;
  readonly products: readonly ProductFields[];
  readonly rules: readonly ComplianceRule[];
  readonly initialResults: readonly ComplianceResult[];
  readonly initialError?: string;
  readonly reportSummary?: ComplianceReportSummary;
  readonly customRules?: readonly CustomComplianceRule[];
  readonly checkProductComplianceImpl?: (opts: CheckProductComplianceOptions) => Promise<ComplianceResult>;
}

function resultClasses(result?: ComplianceResult): string {
  if (!result) return "bg-gray-100 text-gray-700";
  if (result.status === "passed") return "bg-green-50 text-green-700";
  if (result.status === "failed") return "bg-red-50 text-red-700";
  return "bg-amber-50 text-amber-700";
}

function severityClasses(severity: ComplianceRule["severity"]): string {
  if (severity === "critical") return "bg-red-50 text-red-700";
  if (severity === "warning") return "bg-amber-50 text-amber-700";
  return "bg-blue-50 text-blue-700";
}

export function ComplianceDashboard({
  apiBaseUrl,
  products,
  rules,
  initialResults,
  initialError,
  reportSummary,
  customRules = [],
  checkProductComplianceImpl = checkProductCompliance,
}: ComplianceDashboardProps) {
  const [resultsByProductId, setResultsByProductId] = useState<ReadonlyMap<string, ComplianceResult>>(
    () => new Map(initialResults.map((result) => [result.productId, result])),
  );
  const [selectedProductId, setSelectedProductId] = useState<string | null>(products[0]?.id ?? null);
  const [selectedProductIds, setSelectedProductIds] = useState<ReadonlySet<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const results = useMemo(() => Array.from(resultsByProductId.values()), [resultsByProductId]);
  const summary = complianceSummary(results);
  const selectedProduct = products.find((product) => product.id === selectedProductId) ?? products[0];
  const selectedResult = selectedProduct ? resultsByProductId.get(selectedProduct.id) : undefined;

  function toggleProductSelection(productId: string): void {
    setSelectedProductIds((current) => {
      const next = new Set(current);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  async function runBulkCheck(): Promise<void> {
    if (selectedProductIds.size === 0) {
      setError("Select at least one product before running a bulk compliance check.");
      setMessage(null);
      return;
    }

    const productIds = Array.from(selectedProductIds);
    setIsChecking(true);
    setError(null);
    setMessage(null);
    try {
      const nextResults = await Promise.all(
        productIds.map((productId) =>
          checkProductComplianceImpl({ baseUrl: apiBaseUrl, productId, includeSeo: true }),
        ),
      );
      setResultsByProductId((current) => {
        const next = new Map(current);
        nextResults.forEach((result) => next.set(result.productId, result));
        return next;
      });
      setMessage(`Checked ${nextResults.length} products.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to run bulk compliance check.");
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8">
        <p className="text-sm font-medium uppercase tracking-wide text-gray-500">Admin compliance</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Compliance Dashboard</h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          Review product copy, SEO readiness, media alt text, and legal rule status before publishing.
        </p>
      </header>

      <section className="mb-6 grid gap-4 md:grid-cols-4" aria-label="Compliance summary">
        <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-medium text-gray-500">Products</h2>
          <p className="mt-2 text-2xl font-semibold">{summary.total} products</p>
          <p className="mt-1 text-xs text-gray-500">{rules.length} active rules loaded</p>
        </article>
        <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-medium text-gray-500">Passed</h2>
          <p className="mt-2 text-2xl font-semibold text-green-700">{summary.passed} passed</p>
        </article>
        <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-medium text-gray-500">Failed</h2>
          <p className="mt-2 text-2xl font-semibold text-red-700">{summary.failed} failed</p>
          {summary.needsReview > 0 && (
            <p className="mt-1 text-xs text-amber-700">{summary.needsReview} need review</p>
          )}
        </article>
        <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-medium text-gray-500">Average score</h2>
          <p className="mt-2 text-2xl font-semibold">{summary.averageScore} average score</p>
        </article>
      </section>

      {(initialError || error || message) && (
        <div
          role={initialError || error ? "alert" : "status"}
          className={`mb-6 rounded-md border p-4 text-sm ${
            initialError || error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-700"
          }`}
        >
          {initialError ?? error ?? message}
        </div>
      )}

      {reportSummary && (
        <ComplianceReportingPanel
          apiBaseUrl={apiBaseUrl}
          reportSummary={reportSummary}
          customRules={customRules}
        />
      )}

      <section className="mb-8 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Bulk compliance check</h2>
            <p className="mt-1 text-sm text-gray-600">
              Select products and re-run the expected backend compliance endpoint.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void runBulkCheck()}
            disabled={isChecking}
            className="cursor-pointer rounded-md bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-[var(--color-brand-700)] disabled:cursor-wait disabled:bg-gray-300"
          >
            {isChecking ? "Checking..." : "Run bulk compliance check"}
          </button>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          {products.length === 0 && (
            <p className="border-b border-gray-200 p-4 text-sm text-gray-600">
              No products are available for compliance checks.
            </p>
          )}
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th scope="col" className="px-4 py-3">Select</th>
                <th scope="col" className="px-4 py-3">Product</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Score</th>
                <th scope="col" className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map((product) => {
                const result = resultsByProductId.get(product.id);
                const label = result ? complianceResultLabel(result) : "Unchecked";
                return (
                  <tr key={product.id} className="align-top">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedProductIds.has(product.id)}
                        onChange={() => toggleProductSelection(product.id)}
                        aria-label={`Select ${product.title}`}
                        className="h-4 w-4 rounded border-gray-300 text-[var(--color-brand-500)]"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-gray-900">{product.title}</p>
                      <p className="mt-1 text-xs text-gray-500">{product.sku}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${resultClasses(result)}`}>
                        {label}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-semibold text-gray-900">
                      {result ? `${result.score}/100` : "Not checked"}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() => setSelectedProductId(product.id)}
                        className="cursor-pointer rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-800 transition-colors duration-200 hover:bg-gray-50"
                      >
                        Review {product.title}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <aside className="space-y-6">
          {selectedProduct && (
            <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold">{selectedProduct.title} compliance detail</h2>
              <p className="mt-1 text-sm text-gray-600">
                {selectedResult
                  ? `Last checked ${selectedResult.checkedAt}.`
                  : "This product has not been checked yet."}
              </p>

              <div className="mt-5">
                <SeoScoreBreakdown score={selectedResult?.seoScore} />
              </div>

              <div className="mt-5 space-y-3">
                {selectedResult && selectedResult.ruleResults.length > 0 ? (
                  selectedResult.ruleResults.map((ruleResult) => (
                    <article key={ruleResult.rule.id} className="rounded-md border border-gray-200 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold">{ruleResult.rule.name}</h3>
                          <p className="mt-1 text-xs text-gray-500">{ruleResult.rule.description}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${severityClasses(ruleResult.severity)}`}>
                          {ruleResult.severity}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-gray-700">{ruleResult.reason}</p>
                    </article>
                  ))
                ) : (
                  <p className="rounded-md border border-dashed border-gray-300 p-4 text-sm text-gray-600">
                    No failing rule details are available for this product.
                  </p>
                )}
              </div>
            </section>
          )}

          <ImageUploadPreview />
        </aside>
      </section>
    </main>
  );
}
