export type ConfidenceLabel = "High" | "Medium" | "Low";
export type ClaimVerdict = "supported" | "contradicted" | "insufficient_evidence";
export type FactCheckStatus = ClaimVerdict;

export interface FactualConfidence {
  readonly score: number;
  readonly label: ConfidenceLabel;
}

export interface EvidenceSourceInput {
  readonly id: string;
  readonly title: string;
  readonly uri: string;
  readonly excerpt: string;
  readonly similarity: number;
  readonly sourceType?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface EvidenceSource {
  readonly id: string;
  readonly title: string;
  readonly uri: string;
  readonly excerpt: string;
  readonly similarity: number;
  readonly sourceType?: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface ClaimInput {
  readonly id: string;
  readonly text: string;
  readonly confidence: number | FactualConfidence;
  readonly verdict: ClaimVerdict;
  readonly evidence?: readonly EvidenceSourceInput[];
  readonly explanation?: string;
}

export interface Claim {
  readonly id: string;
  readonly text: string;
  readonly confidence: FactualConfidence;
  readonly verdict: ClaimVerdict;
  readonly evidence: readonly EvidenceSource[];
  readonly explanation?: string;
}

export interface FactCheckResultInput {
  readonly id: string;
  readonly productId: string;
  readonly suggestionId?: string;
  readonly overallConfidence: number | FactualConfidence;
  readonly status: FactCheckStatus;
  readonly checkedAt?: string;
  readonly claims?: readonly ClaimInput[];
}

export interface FactCheckResult {
  readonly id: string;
  readonly productId: string;
  readonly suggestionId?: string;
  readonly overallConfidence: FactualConfidence;
  readonly status: FactCheckStatus;
  readonly checkedAt?: string;
  readonly claims: readonly Claim[];
}

export interface FactCheckSummary {
  readonly supported: number;
  readonly contradicted: number;
  readonly insufficient: number;
  readonly total: number;
}

export class FactCheckValidationError extends Error {
  override readonly name = "FactCheckValidationError";
}

function parseNonEmptyString(value: string | undefined, label: string): string {
  const trimmed = value?.trim() ?? "";
  if (trimmed === "") {
    throw new FactCheckValidationError(`${label} must be non-empty`);
  }
  return trimmed;
}

function parseOptionalString(value: string | undefined): string | undefined {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? undefined : trimmed;
}

function parsePercent(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new FactCheckValidationError(`${label} must be between 0 and 100`);
  }
  return Math.round(value);
}

function labelFor(score: number): ConfidenceLabel {
  if (score >= 80) return "High";
  if (score >= 60) return "Medium";
  return "Low";
}

export function createFactualConfidence(input: number | FactualConfidence, label = "confidence"): FactualConfidence {
  const score = parsePercent(typeof input === "number" ? input : input.score, label);
  return {
    score,
    label: labelFor(score),
  };
}

export function confidenceLabel(confidence: FactualConfidence): ConfidenceLabel {
  return labelFor(confidence.score);
}

export function createEvidenceSource(input: EvidenceSourceInput): EvidenceSource {
  if (!Number.isFinite(input.similarity) || input.similarity < 0 || input.similarity > 1) {
    throw new FactCheckValidationError("evidence.similarity must be between 0 and 1");
  }

  return {
    id: parseNonEmptyString(input.id, "evidence.id"),
    title: parseNonEmptyString(input.title, "evidence.title"),
    uri: parseNonEmptyString(input.uri, "evidence.uri"),
    excerpt: parseNonEmptyString(input.excerpt, "evidence.excerpt"),
    similarity: input.similarity,
    sourceType: parseOptionalString(input.sourceType),
    metadata: input.metadata ?? {},
  };
}

export function createClaim(input: ClaimInput): Claim {
  return {
    id: parseNonEmptyString(input.id, "claim.id"),
    text: parseNonEmptyString(input.text, "claim.text"),
    confidence: createFactualConfidence(input.confidence, "claim.confidence"),
    verdict: input.verdict,
    evidence: (input.evidence ?? []).map(createEvidenceSource),
    explanation: parseOptionalString(input.explanation),
  };
}

export function createFactCheckResult(input: FactCheckResultInput): FactCheckResult {
  return {
    id: parseNonEmptyString(input.id, "factCheck.id"),
    productId: parseNonEmptyString(input.productId, "factCheck.productId"),
    suggestionId: parseOptionalString(input.suggestionId),
    overallConfidence: createFactualConfidence(input.overallConfidence, "factCheck.overallConfidence"),
    status: input.status,
    checkedAt: parseOptionalString(input.checkedAt),
    claims: (input.claims ?? []).map(createClaim),
  };
}

export function summarizeFactCheckResult(result: FactCheckResult): FactCheckSummary {
  return result.claims.reduce<FactCheckSummary>(
    (summary, claim) => ({
      supported: summary.supported + (claim.verdict === "supported" ? 1 : 0),
      contradicted: summary.contradicted + (claim.verdict === "contradicted" ? 1 : 0),
      insufficient: summary.insufficient + (claim.verdict === "insufficient_evidence" ? 1 : 0),
      total: summary.total + 1,
    }),
    { supported: 0, contradicted: 0, insufficient: 0, total: 0 },
  );
}
