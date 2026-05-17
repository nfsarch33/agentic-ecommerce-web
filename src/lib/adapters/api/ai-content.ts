import {
  AIContentValidationError,
  createAISuggestion,
  type AIContentSuggestionStatus,
  type AIProductDescriptionSuggestion,
  type QualityScoreInput,
} from "@/lib/domain/ai-description";
import { FactCheckApiError, parseFactCheckResult } from "@/lib/adapters/api/fact-check";
import type { components } from "@/lib/adapters/api/generated/schema";

type BackendContentSuggestion = components["schemas"]["ContentSuggestion"];
type BackendGenerateDescriptionRequest = Partial<components["schemas"]["GenerateDescriptionRequest"]>;

export interface GenerateDescriptionOptions {
  readonly baseUrl: string;
  readonly productId: string;
  readonly prompt: string;
  readonly style?: BackendGenerateDescriptionRequest["style"];
  readonly language?: string;
  readonly maxWords?: number;
  readonly keywords?: readonly string[];
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
  readonly allowBffFallback?: boolean;
  readonly fallbackBffBaseUrl?: string;
}

export interface GetAISuggestionsOptions {
  readonly baseUrl: string;
  readonly productId: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export class AIContentApiError extends Error {
  override readonly name = "AIContentApiError";
  override readonly cause?: unknown;
  readonly status?: number;

  constructor(message: string, options: { readonly status?: number; readonly cause?: unknown } = {}) {
    super(message);
    this.status = options.status;
    this.cause = options.cause;
  }
}

interface RawQualityScore {
  readonly overall?: unknown;
  readonly readability?: unknown;
  readonly seo?: unknown;
  readonly tone?: unknown;
  readonly length?: unknown;
  readonly factual?: unknown;
  readonly notes?: unknown;
}

interface RawSuggestion {
  readonly id?: unknown;
  readonly product_id?: unknown;
  readonly productId?: unknown;
  readonly description?: unknown;
  readonly seo_title?: unknown;
  readonly meta_description?: unknown;
  readonly score?: unknown;
  readonly pass?: unknown;
  readonly tokens_used?: unknown;
  readonly evaluation?: unknown;
  readonly status?: unknown;
  readonly quality_score?: unknown;
  readonly qualityScore?: unknown;
  readonly created_at?: unknown;
  readonly createdAt?: unknown;
  readonly updated_at?: unknown;
  readonly updatedAt?: unknown;
  readonly model?: unknown;
  readonly fact_check_result?: unknown;
  readonly factCheckResult?: unknown;
}

interface RawGenerateResponse {
  readonly suggestion?: unknown;
}

interface RawSuggestionsResponse {
  readonly suggestions?: unknown;
}

interface RawBffDescribeResponse {
  readonly description?: unknown;
}

const statuses = new Set<AIContentSuggestionStatus>(["generated", "approved", "rejected", "edited"]);

function apiUrl(baseUrl: string, path: string): string {
  if (!baseUrl) throw new AIContentApiError("AI content API: baseUrl is required");
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

function optionalApiUrl(baseUrl: string | undefined, path: string): string {
  const normalized = baseUrl?.replace(/\/$/, "") ?? "";
  return `${normalized}${path}`;
}

function parseString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new AIContentApiError(`${label} must be a non-empty string`);
  }
  return value;
}

function parseOptionalString(value: unknown, label: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return parseString(value, label);
}

function parseNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new AIContentApiError(`${label} must be a number`);
  }
  return value;
}

function parseStatus(value: unknown): AIContentSuggestionStatus {
  if (typeof value !== "string" || !statuses.has(value as AIContentSuggestionStatus)) {
    throw new AIContentApiError("suggestion.status is invalid");
  }
  return value as AIContentSuggestionStatus;
}

function parseQualityScore(raw: unknown): QualityScoreInput | undefined {
  if (raw === undefined || raw === null) return undefined;
  const score = raw as RawQualityScore;
  return {
    overall: score.overall === undefined ? undefined : parseNumber(score.overall, "quality_score.overall"),
    readability: parseNumber(score.readability, "quality_score.readability"),
    seo: parseNumber(score.seo, "quality_score.seo"),
    tone: parseNumber(score.tone, "quality_score.tone"),
    length: parseNumber(score.length, "quality_score.length"),
    factual: parseNumber(score.factual, "quality_score.factual"),
    notes: Array.isArray(score.notes) ? score.notes.filter((note): note is string => typeof note === "string") : [],
  };
}

function isBackendContentSuggestion(raw: unknown): raw is BackendContentSuggestion {
  const value = raw as RawSuggestion;
  return (
    typeof value?.product_id === "string" &&
    typeof value.description === "string" &&
    typeof value.score === "number" &&
    typeof value.evaluation === "object" &&
    value.evaluation !== null
  );
}

function backendQualityScore(raw: BackendContentSuggestion): QualityScoreInput {
  const evaluation = raw.evaluation;
  return {
    overall: raw.score,
    readability: evaluation.readability_score,
    seo: seoScoreFromKeywordDensity(evaluation.keyword_density, raw.score),
    tone: evaluation.tone.pass ? 100 : 0,
    length: evaluation.length.within_limit ? 100 : 0,
    factual: evaluation.factual_issues.length === 0 ? 100 : 0,
    notes: [
      ...evaluation.tone.issues,
      ...evaluation.factual_issues,
      ...(raw.pass ? [] : ["Backend quality gate did not pass"]),
    ],
  };
}

function seoScoreFromKeywordDensity(density: Record<string, number>, fallback: number): number {
  const values = Object.values(density);
  if (values.length === 0) return fallback;
  const missing = values.filter((value) => value === 0).length;
  const overstuffed = values.filter((value) => value > 8).length;
  return Math.max(0, Math.min(100, 100 - missing * 25 - overstuffed * 10));
}

function parseSuggestion(raw: unknown): AIProductDescriptionSuggestion {
  if (isBackendContentSuggestion(raw)) {
    const value = raw as RawSuggestion;
    return createAISuggestion({
      id: `backend-${raw.product_id}`,
      productId: raw.product_id,
      description: raw.description,
      status: "generated",
      qualityScore: backendQualityScore(raw),
      source: "backend",
      factCheckResult:
        value.fact_check_result || value.factCheckResult
          ? parseFactCheckResult(value.fact_check_result ?? value.factCheckResult)
          : undefined,
    });
  }

  const value = raw as RawSuggestion;
  try {
    return createAISuggestion({
      id: parseString(value?.id, "suggestion.id"),
      productId: parseString(value?.product_id ?? value?.productId, "suggestion.product_id"),
      description: parseString(value?.description, "suggestion.description"),
      status: parseStatus(value?.status),
      qualityScore: parseQualityScore(value?.quality_score ?? value?.qualityScore),
      createdAt: parseOptionalString(value?.created_at ?? value?.createdAt, "suggestion.created_at"),
      updatedAt: parseOptionalString(value?.updated_at ?? value?.updatedAt, "suggestion.updated_at"),
      model: parseOptionalString(value?.model, "suggestion.model"),
      source: "backend",
      factCheckResult:
        value?.fact_check_result || value?.factCheckResult
          ? parseFactCheckResult(value?.fact_check_result ?? value?.factCheckResult)
          : undefined,
    });
  } catch (err) {
    if (err instanceof AIContentValidationError || err instanceof AIContentApiError || err instanceof FactCheckApiError) {
      throw new AIContentApiError(`parseSuggestion: ${err.message}`, { cause: err });
    }
    throw err;
  }
}

async function readJson(res: Response, label: string): Promise<unknown> {
  if (!res.ok) {
    throw new AIContentApiError(`${label}: HTTP ${res.status}`, { status: res.status });
  }
  try {
    return await res.json();
  } catch (err) {
    throw new AIContentApiError(`${label}: invalid JSON`, { cause: err });
  }
}

async function readErrorCode(res: Response): Promise<string | undefined> {
  try {
    const body = (await res.clone().json()) as { error?: unknown };
    return typeof body?.error === "string" ? body.error : undefined;
  } catch {
    return undefined;
  }
}

function fallbackAllowed(opts: GenerateDescriptionOptions): boolean {
  return opts.allowBffFallback ?? process.env.NODE_ENV !== "production";
}

function shouldFallback(err: unknown, opts: GenerateDescriptionOptions): boolean {
  if (!fallbackAllowed(opts)) return false;
  if (!(err instanceof AIContentApiError)) return false;
  return err.status === 404 || err.status === 501 || err.message.includes("network error");
}

async function callBffDescribe(opts: GenerateDescriptionOptions): Promise<AIProductDescriptionSuggestion> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(optionalApiUrl(opts.fallbackBffBaseUrl, "/api/ai-describe"), {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({ productId: opts.productId, prompt: opts.prompt }),
      signal: opts.signal,
    });
  } catch (err) {
    throw new AIContentApiError("generateDescription fallback: network error", { cause: err });
  }
  const raw = (await readJson(res, "generateDescription fallback")) as RawBffDescribeResponse;
  if (typeof raw.description !== "string") {
    throw new AIContentApiError("generateDescription fallback: invalid response shape");
  }
  return createAISuggestion({
    id: `fallback-${opts.productId}`,
    productId: opts.productId,
    description: raw.description,
    status: "generated",
    source: "bff_fallback",
  });
}

function buildGenerateDescriptionBody(opts: GenerateDescriptionOptions): BackendGenerateDescriptionRequest {
  const body: BackendGenerateDescriptionRequest = {};
  if (opts.style) body.style = opts.style;
  if (opts.language) body.language = opts.language;
  if (opts.maxWords !== undefined) body.max_words = opts.maxWords;
  if (opts.keywords !== undefined) body.keywords = [...opts.keywords];
  return body;
}

export async function generateDescription(
  opts: GenerateDescriptionOptions,
): Promise<AIProductDescriptionSuggestion> {
  if (!opts.productId) throw new AIContentApiError("generateDescription: productId is required");
  if (!opts.prompt.trim()) throw new AIContentApiError("generateDescription: prompt is required");
  const fetchImpl = opts.fetchImpl ?? fetch;

  try {
    const res = await fetchImpl(
      apiUrl(opts.baseUrl, `/api/v1/products/${encodeURIComponent(opts.productId)}/generate-description`),
      {
        method: "POST",
        headers: { accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify(buildGenerateDescriptionBody(opts)),
        signal: opts.signal,
      },
    );
    if (res.status === 504 && (await readErrorCode(res)) === "dependency_timeout") {
      throw new AIContentApiError("The content agent hit its runtime limit. Retry after checking backend health.", {
        status: res.status,
      });
    }
    const raw = (await readJson(res, "generateDescription")) as RawGenerateResponse | RawSuggestion;
    return parseSuggestion("suggestion" in raw ? raw.suggestion : raw);
  } catch (err) {
    if (shouldFallback(err, opts)) {
      return callBffDescribe(opts);
    }
    if (err instanceof AIContentApiError) throw err;
    throw new AIContentApiError("generateDescription: network error", { cause: err });
  }
}

export async function getAISuggestions(
  opts: GetAISuggestionsOptions,
): Promise<AIProductDescriptionSuggestion[]> {
  if (!opts.productId) throw new AIContentApiError("getAISuggestions: productId is required");
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(
      apiUrl(opts.baseUrl, `/api/v1/products/${encodeURIComponent(opts.productId)}/ai-suggestions`),
      {
        method: "GET",
        headers: { accept: "application/json" },
        signal: opts.signal,
      },
    );
  } catch (err) {
    throw new AIContentApiError("getAISuggestions: network error", { cause: err });
  }
  const raw = (await readJson(res, "getAISuggestions")) as RawSuggestionsResponse | unknown[];
  if (isBackendContentSuggestion(raw)) {
    return [parseSuggestion(raw)];
  }
  const suggestions = Array.isArray(raw) ? raw : raw.suggestions;
  if (!Array.isArray(suggestions)) {
    throw new AIContentApiError("getAISuggestions: response body must include suggestions array");
  }
  return suggestions.map(parseSuggestion);
}
