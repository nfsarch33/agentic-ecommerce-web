import type { FactualConfidence } from "@/lib/domain/fact-check";

const toneClasses = {
  High: "border-green-200 bg-green-50 text-green-700",
  Medium: "border-amber-200 bg-amber-50 text-amber-700",
  Low: "border-red-200 bg-red-50 text-red-700",
} as const;

export function ConfidenceBadge({ confidence }: { readonly confidence: FactualConfidence }) {
  return (
    <span
      aria-label={`${confidence.label} factual confidence, ${confidence.score} percent`}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClasses[confidence.label]}`}
    >
      <span>{confidence.label}</span>
      <span aria-hidden="true"> </span>
      <span>{confidence.score}%</span>
    </span>
  );
}
