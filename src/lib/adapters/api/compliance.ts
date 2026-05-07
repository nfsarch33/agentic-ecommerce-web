import {
  ComplianceValidationError,
  createComplianceResult,
  createComplianceRule,
  createSeoScore,
  type ComplianceResult,
  type ComplianceRule,
  type ComplianceRuleCategory,
  type ComplianceSeverity,
  type ComplianceStatus,
  type SeoScore,
} from "@/lib/domain/compliance";

export interface FetchComplianceRulesOptions {
  readonly baseUrl: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface CheckProductComplianceOptions {
  readonly baseUrl: string;
  readonly productId: string;
  readonly includeSeo?: boolean;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface RequestSeoSuggestionsOptions {
  readonly baseUrl: string;
  readonly productId: string;
  readonly targetKeywords?: readonly string[];
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface SeoSuggestionsResponse {
  readonly available: boolean;
  readonly score?: SeoScore;
  readonly suggestions: readonly string[];
}

export class ComplianceApiError extends Error {
  override readonly name = "ComplianceApiError";
  override readonly cause?: unknown;
  readonly status?: number;

  constructor(message: string, options: { readonly status?: number; readonly cause?: unknown } = {}) {
    super(message);
    this.status = options.status;
    this.cause = options.cause;
  }
}

interface RawComplianceRule {
  readonly id?: unknown;
  readonly code?: unknown;
  readonly name?: unknown;
  readonly description?: unknown;
  readonly category?: unknown;
  readonly severity?: unknown;
  readonly enabled?: unknown;
}

interface RawRuleResult {
  readonly rule?: unknown;
  readonly status?: unknown;
  readonly severity?: unknown;
  readonly reason?: unknown;
}

interface RawSeoScore {
  readonly overall?: unknown;
  readonly title?: unknown;
  readonly meta_description?: unknown;
  readonly metaDescription?: unknown;
  readonly slug?: unknown;
  readonly keyword_density?: unknown;
  readonly keywordDensity?: unknown;
  readonly image_alt_text?: unknown;
  readonly imageAltText?: unknown;
  readonly recommendations?: unknown;
}

interface RawComplianceResult {
  readonly product_id?: unknown;
  readonly productId?: unknown;
  readonly status?: unknown;
  readonly score?: unknown;
  readonly checked_at?: unknown;
  readonly checkedAt?: unknown;
  readonly rules?: unknown;
  readonly rule_results?: unknown;
  readonly ruleResults?: unknown;
  readonly seo_score?: unknown;
  readonly seoScore?: unknown;
}

interface RawRulesResponse {
  readonly rules?: unknown;
}

interface RawComplianceResponse {
  readonly result?: unknown;
}

interface RawSeoSuggestionsResponse {
  readonly score?: unknown;
  readonly suggestions?: unknown;
}

function apiUrl(baseUrl: string, path: string): string {
  if (!baseUrl) throw new ComplianceApiError("compliance API: baseUrl is required");
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

function parseString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ComplianceApiError(`${label} must be a non-empty string`);
  }
  return value;
}

function parseBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") throw new ComplianceApiError(`${label} must be boolean`);
  return value;
}

function parseNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ComplianceApiError(`${label} must be a number`);
  }
  return value;
}

function parseRule(raw: unknown): ComplianceRule {
  const value = raw as RawComplianceRule;
  try {
    return createComplianceRule({
      id: parseString(value?.id, "rule.id"),
      code: parseString(value?.code, "rule.code"),
      name: parseString(value?.name, "rule.name"),
      description: parseString(value?.description, "rule.description"),
      category: parseString(value?.category, "rule.category") as ComplianceRuleCategory,
      severity: parseString(value?.severity, "rule.severity") as ComplianceSeverity,
      enabled: parseBoolean(value?.enabled, "rule.enabled"),
    });
  } catch (err) {
    if (err instanceof ComplianceValidationError || err instanceof ComplianceApiError) {
      throw new ComplianceApiError(`parseRule: ${err.message}`, { cause: err });
    }
    throw err;
  }
}

function parseSeoScore(raw: unknown): SeoScore | undefined {
  if (raw === undefined || raw === null) return undefined;
  const value = raw as RawSeoScore;
  try {
    return createSeoScore({
      overall: value.overall === undefined ? undefined : parseNumber(value.overall, "seo_score.overall"),
      title: parseNumber(value.title, "seo_score.title"),
      metaDescription: parseNumber(
        value.meta_description ?? value.metaDescription,
        "seo_score.meta_description",
      ),
      slug: parseNumber(value.slug, "seo_score.slug"),
      keywordDensity: parseNumber(
        value.keyword_density ?? value.keywordDensity,
        "seo_score.keyword_density",
      ),
      imageAltText: parseNumber(
        value.image_alt_text ?? value.imageAltText,
        "seo_score.image_alt_text",
      ),
      recommendations: Array.isArray(value.recommendations)
        ? value.recommendations.filter((item): item is string => typeof item === "string")
        : [],
    });
  } catch (err) {
    if (err instanceof ComplianceValidationError || err instanceof ComplianceApiError) {
      throw new ComplianceApiError(`parseSeoScore: ${err.message}`, { cause: err });
    }
    throw err;
  }
}

function parseRuleResult(raw: unknown) {
  const value = raw as RawRuleResult;
  return {
    rule: parseRule(value?.rule),
    status: parseString(value?.status, "rule_result.status") as ComplianceStatus,
    severity: parseString(value?.severity, "rule_result.severity") as ComplianceSeverity,
    reason: parseString(value?.reason, "rule_result.reason"),
  };
}

function parseComplianceResult(raw: unknown): ComplianceResult {
  const value = raw as RawComplianceResult;
  const rawRuleResults = value?.rules ?? value?.rule_results ?? value?.ruleResults;
  if (!Array.isArray(rawRuleResults)) {
    throw new ComplianceApiError("compliance result must include rules array");
  }
  try {
    return createComplianceResult({
      productId: parseString(value?.product_id ?? value?.productId, "result.product_id"),
      status: parseString(value?.status, "result.status") as ComplianceStatus,
      score: parseNumber(value?.score, "result.score"),
      checkedAt: parseString(value?.checked_at ?? value?.checkedAt, "result.checked_at"),
      ruleResults: rawRuleResults.map(parseRuleResult),
      seoScore: parseSeoScore(value?.seo_score ?? value?.seoScore),
    });
  } catch (err) {
    if (err instanceof ComplianceValidationError || err instanceof ComplianceApiError) {
      throw new ComplianceApiError(`parseComplianceResult: ${err.message}`, { cause: err });
    }
    throw err;
  }
}

async function readJson(res: Response, label: string): Promise<unknown> {
  if (!res.ok) {
    throw new ComplianceApiError(`${label}: HTTP ${res.status}`, { status: res.status });
  }
  try {
    return await res.json();
  } catch (err) {
    throw new ComplianceApiError(`${label}: invalid JSON`, { cause: err });
  }
}

export async function fetchComplianceRules(
  opts: FetchComplianceRulesOptions,
): Promise<ComplianceRule[]> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(apiUrl(opts.baseUrl, "/api/v1/compliance/rules"), {
      method: "GET",
      headers: { accept: "application/json" },
      signal: opts.signal,
    });
  } catch (err) {
    throw new ComplianceApiError("fetchComplianceRules: network error", { cause: err });
  }
  const raw = (await readJson(res, "fetchComplianceRules")) as RawRulesResponse | unknown[];
  const rules = Array.isArray(raw) ? raw : raw.rules;
  if (!Array.isArray(rules)) {
    throw new ComplianceApiError("fetchComplianceRules: response body must include rules array");
  }
  return rules.map(parseRule);
}

export async function checkProductCompliance(
  opts: CheckProductComplianceOptions,
): Promise<ComplianceResult> {
  if (!opts.productId) throw new ComplianceApiError("checkProductCompliance: productId is required");
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(
      apiUrl(opts.baseUrl, `/api/v1/products/${encodeURIComponent(opts.productId)}/compliance-check`),
      {
        method: "POST",
        headers: { accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify({ include_seo: opts.includeSeo ?? true }),
        signal: opts.signal,
      },
    );
  } catch (err) {
    throw new ComplianceApiError("checkProductCompliance: network error", { cause: err });
  }
  const raw = (await readJson(res, "checkProductCompliance")) as RawComplianceResponse | RawComplianceResult;
  return parseComplianceResult("result" in raw ? raw.result : raw);
}

export async function requestSeoSuggestions(
  opts: RequestSeoSuggestionsOptions,
): Promise<SeoSuggestionsResponse> {
  if (!opts.productId) throw new ComplianceApiError("requestSeoSuggestions: productId is required");
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(
      apiUrl(opts.baseUrl, `/api/v1/products/${encodeURIComponent(opts.productId)}/seo-suggestions`),
      {
        method: "POST",
        headers: { accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify({ target_keywords: opts.targetKeywords ?? [] }),
        signal: opts.signal,
      },
    );
  } catch (err) {
    throw new ComplianceApiError("requestSeoSuggestions: network error", { cause: err });
  }
  if (res.status === 404 || res.status === 501) {
    return { available: false, suggestions: [] };
  }
  const raw = (await readJson(res, "requestSeoSuggestions")) as RawSeoSuggestionsResponse;
  const suggestions = Array.isArray(raw.suggestions)
    ? raw.suggestions.filter((item): item is string => typeof item === "string")
    : [];
  return {
    available: true,
    score: parseSeoScore(raw.score),
    suggestions,
  };
}
