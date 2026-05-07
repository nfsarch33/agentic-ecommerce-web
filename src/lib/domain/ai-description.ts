import type { FactCheckResult } from "@/lib/domain/fact-check";

export type AIContentSuggestionStatus = "generated" | "approved" | "rejected" | "edited";
export type AISuggestionSource = "backend" | "bff_fallback";

export interface QualityScoreBreakdown {
  readonly readability: number;
  readonly seo: number;
  readonly tone: number;
  readonly length: number;
  readonly factual: number;
}

export interface QualityScoreInput extends QualityScoreBreakdown {
  readonly overall?: number;
  readonly notes?: readonly string[];
}

export interface QualityScore {
  readonly overall: number;
  readonly breakdown: QualityScoreBreakdown;
  readonly notes: readonly string[];
}

export interface AISuggestionInput {
  readonly id: string;
  readonly productId: string;
  readonly description: string;
  readonly status: AIContentSuggestionStatus;
  readonly qualityScore?: QualityScoreInput;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly model?: string;
  readonly source?: AISuggestionSource;
  readonly factCheckResult?: FactCheckResult;
}

export interface AIProductDescriptionSuggestion {
  readonly id: string;
  readonly productId: string;
  readonly description: string;
  readonly status: AIContentSuggestionStatus;
  readonly qualityScore?: QualityScore;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly model?: string;
  readonly source: AISuggestionSource;
  readonly factCheckResult?: FactCheckResult;
}

export class AIContentValidationError extends Error {
  override readonly name = "AIContentValidationError";
}

function parseNonEmptyString(value: string, label: string): string {
  const trimmed = value.trim();
  if (trimmed === "") {
    throw new AIContentValidationError(`${label} must be non-empty`);
  }
  return trimmed;
}

function parseScore(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new AIContentValidationError(`${label} must be between 0 and 100`);
  }
  return value;
}

export function createQualityScore(input: QualityScoreInput): QualityScore {
  const breakdown: QualityScoreBreakdown = {
    readability: parseScore(input.readability, "qualityScore.readability"),
    seo: parseScore(input.seo, "qualityScore.seo"),
    tone: parseScore(input.tone, "qualityScore.tone"),
    length: parseScore(input.length, "qualityScore.length"),
    factual: parseScore(input.factual, "qualityScore.factual"),
  };
  const computedOverall = Math.round(
    (breakdown.readability + breakdown.seo + breakdown.tone + breakdown.length + breakdown.factual) / 5,
  );
  const overall = input.overall === undefined ? computedOverall : Math.round(parseScore(input.overall, "qualityScore.overall"));
  return {
    overall,
    breakdown,
    notes: input.notes ?? [],
  };
}

export function createAISuggestion(input: AISuggestionInput): AIProductDescriptionSuggestion {
  return {
    id: parseNonEmptyString(input.id, "suggestion.id"),
    productId: parseNonEmptyString(input.productId, "suggestion.productId"),
    description: parseNonEmptyString(input.description, "suggestion.description"),
    status: input.status,
    qualityScore: input.qualityScore ? createQualityScore(input.qualityScore) : undefined,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    model: input.model,
    source: input.source ?? "backend",
    factCheckResult: input.factCheckResult,
  };
}

export function qualityScoreLabel(score: QualityScore | undefined): "Unavailable" | "Weak" | "Needs work" | "Strong" {
  if (!score) return "Unavailable";
  if (score.overall >= 80) return "Strong";
  if (score.overall >= 60) return "Needs work";
  return "Weak";
}

function timestamp(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function selectLatestSuggestion(
  suggestions: readonly AIProductDescriptionSuggestion[],
): AIProductDescriptionSuggestion | undefined {
  return [...suggestions]
    .filter((suggestion) => suggestion.status !== "rejected")
    .sort((a, b) => timestamp(b.createdAt) - timestamp(a.createdAt))[0];
}
