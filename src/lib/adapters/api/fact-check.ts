import {
  FactCheckValidationError,
  createEvidenceSource,
  createFactCheckResult,
  type ClaimVerdict,
  type EvidenceSource,
  type FactCheckResult,
  type FactCheckStatus,
} from "@/lib/domain/fact-check";

export interface GetLatestFactCheckResultOptions {
  readonly baseUrl: string;
  readonly productId: string;
  readonly suggestionId?: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface SearchEvidenceSourcesOptions {
  readonly baseUrl: string;
  readonly query: string;
  readonly productId?: string;
  readonly limit?: number;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export class FactCheckApiError extends Error {
  override readonly name = "FactCheckApiError";
  override readonly cause?: unknown;
  readonly status?: number;

  constructor(message: string, options: { readonly status?: number; readonly cause?: unknown } = {}) {
    super(message);
    this.status = options.status;
    this.cause = options.cause;
  }
}

interface RawEvidenceSource {
  readonly id?: unknown;
  readonly title?: unknown;
  readonly uri?: unknown;
  readonly excerpt?: unknown;
  readonly similarity?: unknown;
  readonly source_type?: unknown;
  readonly sourceType?: unknown;
  readonly metadata?: unknown;
}

interface RawClaim {
  readonly id?: unknown;
  readonly text?: unknown;
  readonly confidence?: unknown;
  readonly verdict?: unknown;
  readonly evidence?: unknown;
  readonly explanation?: unknown;
}

interface RawFactCheckResult {
  readonly id?: unknown;
  readonly product_id?: unknown;
  readonly productId?: unknown;
  readonly suggestion_id?: unknown;
  readonly suggestionId?: unknown;
  readonly overall_confidence?: unknown;
  readonly overallConfidence?: unknown;
  readonly status?: unknown;
  readonly checked_at?: unknown;
  readonly checkedAt?: unknown;
  readonly claims?: unknown;
}

function apiUrl(baseUrl: string, path: string): string {
  if (!baseUrl) throw new FactCheckApiError("fact-check API: baseUrl is required");
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

function parseString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new FactCheckApiError(`${label} must be a non-empty string`);
  }
  return value;
}

function parseOptionalString(value: unknown, label: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return parseString(value, label);
}

function parseNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new FactCheckApiError(`${label} must be a number`);
  }
  return value;
}

function parseMetadata(value: unknown): Readonly<Record<string, unknown>> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function parseEvidenceSource(raw: unknown): EvidenceSource {
  const value = raw as RawEvidenceSource;
  try {
    return createEvidenceSource({
      id: parseString(value?.id, "evidence.id"),
      title: parseString(value?.title, "evidence.title"),
      uri: parseString(value?.uri, "evidence.uri"),
      excerpt: parseString(value?.excerpt, "evidence.excerpt"),
      similarity: parseNumber(value?.similarity, "evidence.similarity"),
      sourceType: parseOptionalString(value?.source_type ?? value?.sourceType, "evidence.source_type"),
      metadata: parseMetadata(value?.metadata),
    });
  } catch (err) {
    if (err instanceof FactCheckValidationError || err instanceof FactCheckApiError) {
      throw new FactCheckApiError(`parseEvidenceSource: ${err.message}`, { cause: err });
    }
    throw err;
  }
}

export function parseFactCheckResult(raw: unknown): FactCheckResult {
  const value = raw as RawFactCheckResult;
  try {
    const rawClaims = value?.claims;
    if (!Array.isArray(rawClaims)) {
      throw new FactCheckApiError("factCheck.claims must be an array");
    }

    return createFactCheckResult({
      id: parseString(value?.id, "factCheck.id"),
      productId: parseString(value?.product_id ?? value?.productId, "factCheck.product_id"),
      suggestionId: parseOptionalString(value?.suggestion_id ?? value?.suggestionId, "factCheck.suggestion_id"),
      overallConfidence: parseNumber(
        value?.overall_confidence ?? value?.overallConfidence,
        "factCheck.overall_confidence",
      ),
      status: parseString(value?.status, "factCheck.status") as FactCheckStatus,
      checkedAt: parseOptionalString(value?.checked_at ?? value?.checkedAt, "factCheck.checked_at"),
      claims: rawClaims.map((claim) => {
        const rawClaim = claim as RawClaim;
        const evidence = rawClaim.evidence;
        return {
          id: parseString(rawClaim?.id, "claim.id"),
          text: parseString(rawClaim?.text, "claim.text"),
          confidence: parseNumber(rawClaim?.confidence, "claim.confidence"),
          verdict: parseString(rawClaim?.verdict, "claim.verdict") as ClaimVerdict,
          evidence: Array.isArray(evidence) ? evidence.map(parseEvidenceSource) : [],
          explanation: parseOptionalString(rawClaim?.explanation, "claim.explanation"),
        };
      }),
    });
  } catch (err) {
    if (err instanceof FactCheckValidationError || err instanceof FactCheckApiError) {
      throw new FactCheckApiError(`parseFactCheckResult: ${err.message}`, { cause: err });
    }
    throw err;
  }
}

async function readJson(res: Response, label: string): Promise<unknown> {
  if (!res.ok) {
    throw new FactCheckApiError(`${label}: HTTP ${res.status}`, { status: res.status });
  }
  try {
    return await res.json();
  } catch (err) {
    throw new FactCheckApiError(`${label}: invalid JSON`, { cause: err });
  }
}

export async function getLatestFactCheckResult(
  opts: GetLatestFactCheckResultOptions,
): Promise<FactCheckResult | undefined> {
  if (!opts.productId) throw new FactCheckApiError("getLatestFactCheckResult: productId is required");
  const params = new URLSearchParams();
  if (opts.suggestionId) params.set("suggestion_id", opts.suggestionId);
  const query = params.size > 0 ? `?${params.toString()}` : "";
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(
      apiUrl(opts.baseUrl, `/api/v1/products/${encodeURIComponent(opts.productId)}/fact-check-results/latest${query}`),
      {
        method: "GET",
        headers: { accept: "application/json" },
        signal: opts.signal,
      },
    );
  } catch (err) {
    throw new FactCheckApiError("getLatestFactCheckResult: network error", { cause: err });
  }

  const raw = (await readJson(res, "getLatestFactCheckResult")) as { result?: unknown } | RawFactCheckResult;
  const result = "result" in raw ? raw.result : raw;
  return result ? parseFactCheckResult(result) : undefined;
}

export async function searchEvidenceSources(opts: SearchEvidenceSourcesOptions): Promise<EvidenceSource[]> {
  const query = opts.query.trim();
  if (query === "") throw new FactCheckApiError("searchEvidenceSources: query is required");
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(apiUrl(opts.baseUrl, "/api/v1/rag/evidence/search"), {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({
        query,
        ...(opts.productId ? { product_id: opts.productId } : {}),
        ...(opts.limit !== undefined ? { limit: opts.limit } : {}),
      }),
      signal: opts.signal,
    });
  } catch (err) {
    throw new FactCheckApiError("searchEvidenceSources: network error", { cause: err });
  }

  const raw = (await readJson(res, "searchEvidenceSources")) as { sources?: unknown } | unknown[];
  const sources = Array.isArray(raw) ? raw : raw.sources;
  if (!Array.isArray(sources)) {
    throw new FactCheckApiError("searchEvidenceSources: response body must include sources array");
  }
  return sources.map(parseEvidenceSource);
}
