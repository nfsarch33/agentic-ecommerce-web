export type ComplianceRuleCategory = "content" | "seo" | "media" | "legal";
export type ComplianceSeverity = "info" | "warning" | "critical";
export type ComplianceStatus = "passed" | "failed" | "needs_review";
export type RuleCheckStatus = ComplianceStatus;
export type AltTextStatus = "missing" | "too_short" | "valid";

export interface ComplianceRule {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description: string;
  readonly category: ComplianceRuleCategory;
  readonly severity: ComplianceSeverity;
  readonly enabled: boolean;
}

export interface ComplianceRuleResult {
  readonly rule: ComplianceRule;
  readonly status: RuleCheckStatus;
  readonly severity: ComplianceSeverity;
  readonly reason: string;
}

export interface SeoScoreInput {
  readonly overall?: number;
  readonly title: number;
  readonly metaDescription: number;
  readonly slug: number;
  readonly keywordDensity: number;
  readonly imageAltText: number;
  readonly recommendations?: readonly string[];
}

export interface SeoScoreBreakdown {
  readonly title: number;
  readonly metaDescription: number;
  readonly slug: number;
  readonly keywordDensity: number;
  readonly imageAltText: number;
}

export interface SeoScore {
  readonly overall: number;
  readonly breakdown: SeoScoreBreakdown;
  readonly recommendations: readonly string[];
}

export interface ComplianceResultInput {
  readonly productId: string;
  readonly status: ComplianceStatus;
  readonly score: number;
  readonly checkedAt: string;
  readonly ruleResults: readonly ComplianceRuleResult[];
  readonly seoScore?: SeoScore | SeoScoreInput;
}

export interface ComplianceResult {
  readonly productId: string;
  readonly status: ComplianceStatus;
  readonly score: number;
  readonly checkedAt: string;
  readonly ruleResults: readonly ComplianceRuleResult[];
  readonly seoScore?: SeoScore;
}

export interface ComplianceSummary {
  readonly total: number;
  readonly passed: number;
  readonly failed: number;
  readonly needsReview: number;
  readonly averageScore: number;
}

export interface MediaAssetInput {
  readonly id: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly previewUrl: string;
  readonly altText: string;
  readonly width?: number;
  readonly height?: number;
}

export interface MediaOptimizationPlan {
  readonly format: "image/webp";
  readonly maxWidth: number;
  readonly quality: number;
  readonly note: string;
}

export interface MediaAsset {
  readonly id: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly previewUrl: string;
  readonly altText: string;
  readonly altTextStatus: AltTextStatus;
  readonly width?: number;
  readonly height?: number;
  readonly optimization: MediaOptimizationPlan;
}

export class ComplianceValidationError extends Error {
  override readonly name = "ComplianceValidationError";
}

const severities = new Set<ComplianceSeverity>(["info", "warning", "critical"]);
const categories = new Set<ComplianceRuleCategory>(["content", "seo", "media", "legal"]);
const statuses = new Set<ComplianceStatus>(["passed", "failed", "needs_review"]);

function parseNonEmptyString(value: string, label: string): string {
  const trimmed = value.trim();
  if (trimmed === "") throw new ComplianceValidationError(`${label} must be non-empty`);
  return trimmed;
}

export function parseScore(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new ComplianceValidationError(`${label} must be between 0 and 100`);
  }
  return Math.round(value);
}

export function parseComplianceStatus(value: string, label = "status"): ComplianceStatus {
  if (!statuses.has(value as ComplianceStatus)) {
    throw new ComplianceValidationError(`${label} is invalid`);
  }
  return value as ComplianceStatus;
}

export function parseSeverity(value: string, label = "severity"): ComplianceSeverity {
  if (!severities.has(value as ComplianceSeverity)) {
    throw new ComplianceValidationError(`${label} is invalid`);
  }
  return value as ComplianceSeverity;
}

export function parseRuleCategory(value: string, label = "category"): ComplianceRuleCategory {
  if (!categories.has(value as ComplianceRuleCategory)) {
    throw new ComplianceValidationError(`${label} is invalid`);
  }
  return value as ComplianceRuleCategory;
}

export function createComplianceRule(input: ComplianceRule): ComplianceRule {
  return {
    id: parseNonEmptyString(input.id, "rule.id"),
    code: parseNonEmptyString(input.code, "rule.code"),
    name: parseNonEmptyString(input.name, "rule.name"),
    description: parseNonEmptyString(input.description, "rule.description"),
    category: parseRuleCategory(input.category, "rule.category"),
    severity: parseSeverity(input.severity, "rule.severity"),
    enabled: Boolean(input.enabled),
  };
}

export function createSeoScore(input: SeoScoreInput): SeoScore {
  const breakdown: SeoScoreBreakdown = {
    title: parseScore(input.title, "seoScore.title"),
    metaDescription: parseScore(input.metaDescription, "seoScore.metaDescription"),
    slug: parseScore(input.slug, "seoScore.slug"),
    keywordDensity: parseScore(input.keywordDensity, "seoScore.keywordDensity"),
    imageAltText: parseScore(input.imageAltText, "seoScore.imageAltText"),
  };
  const computedOverall = Math.round(
    (breakdown.title +
      breakdown.metaDescription +
      breakdown.slug +
      breakdown.keywordDensity +
      breakdown.imageAltText) /
      5,
  );
  return {
    overall:
      input.overall === undefined ? computedOverall : parseScore(input.overall, "seoScore.overall"),
    breakdown,
    recommendations: input.recommendations ?? [],
  };
}

function isSeoScore(value: SeoScore | SeoScoreInput): value is SeoScore {
  return "breakdown" in value;
}

export function createComplianceResult(input: ComplianceResultInput): ComplianceResult {
  return {
    productId: parseNonEmptyString(input.productId, "productId"),
    status: parseComplianceStatus(input.status),
    score: parseScore(input.score, "compliance.score"),
    checkedAt: parseNonEmptyString(input.checkedAt, "checkedAt"),
    ruleResults: input.ruleResults.map((result) => ({
      rule: createComplianceRule(result.rule),
      status: parseComplianceStatus(result.status, "ruleResult.status"),
      severity: parseSeverity(result.severity, "ruleResult.severity"),
      reason: parseNonEmptyString(result.reason, "ruleResult.reason"),
    })),
    seoScore: input.seoScore
      ? isSeoScore(input.seoScore)
        ? input.seoScore
        : createSeoScore(input.seoScore)
      : undefined,
  };
}

export function complianceResultLabel(result: Pick<ComplianceResult, "status">): "Pass" | "Fail" | "Review" {
  if (result.status === "passed") return "Pass";
  if (result.status === "failed") return "Fail";
  return "Review";
}

export function seoScoreLabel(score?: SeoScore): "Unavailable" | "Weak" | "Needs work" | "Strong" {
  if (!score) return "Unavailable";
  if (score.overall >= 80) return "Strong";
  if (score.overall >= 60) return "Needs work";
  return "Weak";
}

export function complianceSummary(results: readonly ComplianceResult[]): ComplianceSummary {
  const total = results.length;
  const passed = results.filter((result) => result.status === "passed").length;
  const failed = results.filter((result) => result.status === "failed").length;
  const needsReview = results.filter((result) => result.status === "needs_review").length;
  const averageScore =
    total === 0 ? 0 : Math.round(results.reduce((sum, result) => sum + result.score, 0) / total);
  return { total, passed, failed, needsReview, averageScore };
}

export function altTextStatus(altText: string): AltTextStatus {
  const trimmed = altText.trim();
  if (trimmed === "") return "missing";
  if (trimmed.length < 12) return "too_short";
  return "valid";
}

export function createMediaAsset(input: MediaAssetInput): MediaAsset {
  return {
    id: parseNonEmptyString(input.id, "media.id"),
    fileName: parseNonEmptyString(input.fileName, "media.fileName"),
    mimeType: parseNonEmptyString(input.mimeType, "media.mimeType"),
    sizeBytes: Math.max(0, Math.round(input.sizeBytes)),
    previewUrl: parseNonEmptyString(input.previewUrl, "media.previewUrl"),
    altText: input.altText,
    altTextStatus: altTextStatus(input.altText),
    width: input.width,
    height: input.height,
    optimization: {
      format: "image/webp",
      maxWidth: 1600,
      quality: 82,
      note: "Preview only. Backend media processing will perform actual optimization when available.",
    },
  };
}
