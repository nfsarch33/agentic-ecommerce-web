import {
  AIContentValidationError,
  createAISuggestion,
  type AIContentSuggestionStatus,
  type AIProductDescriptionSuggestion,
  type QualityScoreInput,
} from "@/lib/domain/ai-description";

export interface GenerateDescriptionOptions {
  readonly baseUrl: string;
  readonly productId: string;
  readonly prompt: string;
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
  readonly status?: unknown;
  readonly quality_score?: unknown;
  readonly qualityScore?: unknown;
  readonly created_at?: unknown;
  readonly createdAt?: unknown;
  readonly updated_at?: unknown;
  readonly updatedAt?: unknown;
  readonly model?: unknown;
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

function parseSuggestion(raw: unknown): AIProductDescriptionSuggestion {
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
    });
  } catch (err) {
    if (err instanceof AIContentValidationError || err instanceof AIContentApiError) {
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
        body: JSON.stringify({ prompt: opts.prompt }),
        signal: opts.signal,
      },
    );
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
  const suggestions = Array.isArray(raw) ? raw : raw.suggestions;
  if (!Array.isArray(suggestions)) {
    throw new AIContentApiError("getAISuggestions: response body must include suggestions array");
  }
  return suggestions.map(parseSuggestion);
}
