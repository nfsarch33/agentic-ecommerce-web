import {
  FactCheckValidationError,
  createEvidenceSource,
  createFactCheckResult,
  type ClaimVerdict,
  type EvidenceSource,
  type FactCheckResult,
  type FactCheckStatus,
} from "@/lib/domain/fact-check";
import type { components } from "@/lib/adapters/api/generated/schema";

type BackendFactCheckResult = components["schemas"]["FactCheckResult"];
type BackendClaimCheck = components["schemas"]["ClaimCheck"];
type BackendRAGSearchResult = components["schemas"]["RAGSearchResult"];
type BackendRAGSearchResponse = components["schemas"]["RAGSearchResponse"];

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

type RawEvidenceSource = Partial<BackendRAGSearchResult> & {
  readonly id?: unknown;
  readonly title?: unknown;
  readonly uri?: unknown;
  readonly excerpt?: unknown;
  readonly similarity?: unknown;
  readonly source_type?: unknown;
  readonly sourceType?: unknown;
  readonly metadata?: unknown;
};

type RawClaim = Partial<BackendClaimCheck> & {
  readonly id?: unknown;
  readonly text?: unknown;
  readonly confidence?: unknown;
  readonly verdict?: unknown;
  readonly evidence?: unknown;
  readonly explanation?: unknown;
};

type RawFactCheckResult = Partial<BackendFactCheckResult> & {
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
};

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

function parseConfidencePercent(value: unknown, label: string): number {
  const score = parseNumber(value, label);
  return score <= 1 ? Math.round(score * 100) : score;
}

function parseMetadata(value: unknown): Readonly<Record<string, unknown>> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function parseEvidenceSource(raw: unknown): EvidenceSource {
  const value = raw as RawEvidenceSource;
  try {
    if (typeof value?.chunk_id === "string" && typeof value.text === "string" && typeof value.score === "number") {
      const metadata = parseMetadata(value.metadata);
      const sourceType = typeof metadata["source_type"] === "string" ? metadata["source_type"] : undefined;
      return createEvidenceSource({
        id: parseString(value.chunk_id, "evidence.chunk_id"),
        title: parseOptionalString(value.title, "evidence.title") ?? parseString(value.document_id, "evidence.document_id"),
        uri: parseOptionalString(value.source, "evidence.source") ?? parseString(value.document_id, "evidence.document_id"),
        excerpt: parseString(value.text, "evidence.text"),
        similarity: parseNumber(value.score, "evidence.score"),
        sourceType,
        metadata,
      });
    }
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

    if (typeof value?.pass === "boolean" && typeof value.confidence === "number") {
      const claims = rawClaims.map((claim, index) => {
        const rawClaim = claim as RawClaim;
        const evidence = rawClaim.evidence;
        const status = parseString(rawClaim?.status, "claim.status") as ClaimVerdict;
        return {
          id: parseOptionalString(rawClaim?.id, "claim.id") ?? `claim_${index + 1}`,
          text: parseString(rawClaim?.text ?? rawClaim?.claim?.text, "claim.text"),
          confidence: parseConfidencePercent(rawClaim?.confidence, "claim.confidence"),
          verdict: status,
          evidence: Array.isArray(evidence) ? evidence.map(parseEvidenceSource) : [],
          explanation: parseOptionalString(rawClaim?.explanation, "claim.explanation"),
        };
      });
      const firstNonSupported = claims.find((claim) => claim.verdict !== "supported");
      return createFactCheckResult({
        id: parseOptionalString(value?.id, "factCheck.id") ?? "fact-check-result",
        productId: parseOptionalString(value?.product_id ?? value?.productId, "factCheck.product_id") ?? "unknown-product",
        suggestionId: parseOptionalString(value?.suggestion_id ?? value?.suggestionId, "factCheck.suggestion_id"),
        overallConfidence: parseConfidencePercent(value?.confidence, "factCheck.confidence"),
        status: value.pass ? "supported" : (firstNonSupported?.verdict ?? "unsupported"),
        checkedAt: parseOptionalString(value?.checked_at ?? value?.checkedAt, "factCheck.checked_at"),
        claims,
      });
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

async function readErrorCode(res: Response): Promise<string | undefined> {
  try {
    const body = (await res.clone().json()) as { error?: unknown };
    return typeof body?.error === "string" ? body.error : undefined;
  } catch {
    return undefined;
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
  const params = new URLSearchParams({ q: query });
  if (opts.limit !== undefined) params.set("top_k", String(opts.limit));
  let res: Response;
  try {
    res = await fetchImpl(apiUrl(opts.baseUrl, `/api/v1/rag/search?${params.toString()}`), {
      method: "GET",
      headers: { accept: "application/json" },
      signal: opts.signal,
    });
  } catch (err) {
    throw new FactCheckApiError("searchEvidenceSources: network error", { cause: err });
  }

  if (res.status === 504 && (await readErrorCode(res)) === "dependency_timeout") {
    throw new FactCheckApiError("RAG evidence search hit its runtime limit. Retry with a narrower query.", {
      status: res.status,
    });
  }

  const raw = (await readJson(res, "searchEvidenceSources")) as BackendRAGSearchResponse | { sources?: unknown } | unknown[];
  const sources = Array.isArray(raw) ? raw : "results" in raw ? raw.results : raw.sources;
  if (!Array.isArray(sources)) {
    throw new FactCheckApiError("searchEvidenceSources: response body must include results array");
  }
  return sources.map(parseEvidenceSource);
}
