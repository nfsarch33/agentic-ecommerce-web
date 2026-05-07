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
import type { components } from "./generated/schema";

type OpenAPIComplianceCheckRequest = components["schemas"]["ComplianceCheckRequest"];
type OpenAPIComplianceCheckResponse = components["schemas"]["ComplianceCheckResponse"];
type OpenAPISEOSuggestionRequest = components["schemas"]["SEOSuggestionRequest"];
type OpenAPISEOSuggestionResponse = components["schemas"]["SEOSuggestionResponse"];

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

  constructor(
    message: string,
    options: { readonly status?: number; readonly cause?: unknown } = {},
  ) {
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
  readonly id?: unknown;
  readonly pass?: unknown;
  readonly score?: unknown;
  readonly reasons?: unknown;
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
  readonly pass?: unknown;
  readonly status?: unknown;
  readonly score?: unknown;
  readonly checked_at?: unknown;
  readonly checkedAt?: unknown;
  readonly severity?: unknown;
  readonly rules?: unknown;
  readonly results?: unknown;
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

function humanizeRuleId(id: string): string {
  return id
    .split(/[_\-.]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function inferRuleCategory(id: string): ComplianceRuleCategory {
  if (id.includes("seo") || id.includes("slug") || id.includes("meta")) return "seo";
  if (id.includes("image") || id.includes("media") || id.includes("alt")) return "media";
  if (id.includes("legal") || id.includes("disclaimer")) return "legal";
  return "content";
}

function statusFromBackend(pass: boolean, severity: ComplianceSeverity): ComplianceStatus {
  if (pass) return "passed";
  if (severity === "info" || severity === "warning") return "needs_review";
  return "failed";
}

function parseRule(raw: unknown): ComplianceRule {
  const value = raw as RawComplianceRule;
  try {
    const id = parseString(value?.id, "rule.id");
    return createComplianceRule({
      id,
      code: typeof value?.code === "string" && value.code.trim() !== "" ? value.code : id,
      name:
        typeof value?.name === "string" && value.name.trim() !== ""
          ? value.name
          : humanizeRuleId(id),
      description: parseString(value?.description, "rule.description"),
      category:
        typeof value?.category === "string" && value.category.trim() !== ""
          ? (value.category as ComplianceRuleCategory)
          : inferRuleCategory(id),
      severity: parseString(value?.severity, "rule.severity") as ComplianceSeverity,
      enabled: value?.enabled === undefined ? true : parseBoolean(value.enabled, "rule.enabled"),
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
  if (typeof raw === "number") return seoScoreFromOverall(raw);
  const value = raw as RawSeoScore;
  try {
    return createSeoScore({
      overall:
        value.overall === undefined ? undefined : parseNumber(value.overall, "seo_score.overall"),
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

function seoScoreFromOverall(
  overall: number,
  imageAltText = overall,
  recommendations: readonly string[] = [],
): SeoScore {
  const score = parseNumber(overall, "seo_score.score");
  const imageScore = parseNumber(imageAltText, "seo_score.image_alt_text");
  return createSeoScore({
    overall: score,
    title: score,
    metaDescription: score,
    slug: score,
    keywordDensity: score,
    imageAltText: imageScore,
    recommendations,
  });
}

function parseRuleResult(raw: unknown) {
  const value = raw as RawRuleResult;
  if (value?.rule !== undefined) {
    return {
      rule: parseRule(value.rule),
      status: parseString(value?.status, "rule_result.status") as ComplianceStatus,
      severity: parseString(value?.severity, "rule_result.severity") as ComplianceSeverity,
      reason: parseString(value?.reason, "rule_result.reason"),
    };
  }

  const id = parseString(value?.id, "rule_result.id");
  const pass = parseBoolean(value?.pass, "rule_result.pass");
  const severity = parseString(value?.severity, "rule_result.severity") as ComplianceSeverity;
  const reasons = Array.isArray(value?.reasons)
    ? value.reasons.filter((item): item is string => typeof item === "string" && item.trim() !== "")
    : [];
  return {
    rule: createComplianceRule({
      id,
      code: id,
      name: humanizeRuleId(id),
      description: `${humanizeRuleId(id)} backend compliance rule.`,
      category: inferRuleCategory(id),
      severity,
      enabled: true,
    }),
    status: statusFromBackend(pass, severity),
    severity,
    reason: reasons.length > 0 ? reasons.join(" ") : pass ? "Rule passed." : "Rule failed.",
  };
}

function parseBackendComplianceSeoScore(rawRuleResults: unknown): SeoScore | undefined {
  if (!Array.isArray(rawRuleResults)) return undefined;
  const results = rawRuleResults as RawRuleResult[];
  const seoResult = results.find((result) => result.id === "seo_minimum_score");
  if (!seoResult || typeof seoResult.score !== "number") return undefined;
  const imageResult = results.find((result) => result.id === "image_alt_text");
  const recommendations = Array.isArray(seoResult.reasons)
    ? seoResult.reasons.filter((item): item is string => typeof item === "string")
    : [];
  return seoScoreFromOverall(
    seoResult.score,
    typeof imageResult?.score === "number" ? imageResult.score : seoResult.score,
    recommendations,
  );
}

function parseComplianceResult(raw: unknown): ComplianceResult {
  const value = raw as RawComplianceResult;
  const rawRuleResults =
    value?.results ?? value?.rules ?? value?.rule_results ?? value?.ruleResults;
  if (!Array.isArray(rawRuleResults)) {
    throw new ComplianceApiError("compliance result must include rules array");
  }
  try {
    const pass =
      value?.pass === undefined
        ? parseString(value?.status, "result.status") === "passed"
        : parseBoolean(value.pass, "result.pass");
    const severity =
      typeof value?.severity === "string"
        ? (value.severity as ComplianceSeverity)
        : pass
          ? "info"
          : "critical";
    return createComplianceResult({
      productId: parseString(value?.product_id ?? value?.productId, "result.product_id"),
      status:
        typeof value?.status === "string"
          ? (value.status as ComplianceStatus)
          : statusFromBackend(pass, severity),
      score: parseNumber(value?.score, "result.score"),
      checkedAt:
        typeof (value?.checked_at ?? value?.checkedAt) === "string"
          ? ((value.checked_at ?? value.checkedAt) as string)
          : "1970-01-01T00:00:00.000Z",
      ruleResults: rawRuleResults.map(parseRuleResult),
      seoScore:
        parseSeoScore(value?.seo_score ?? value?.seoScore) ??
        parseBackendComplianceSeoScore(rawRuleResults),
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
  if (!opts.productId)
    throw new ComplianceApiError("checkProductCompliance: productId is required");
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(
      apiUrl(
        opts.baseUrl,
        `/api/v1/products/${encodeURIComponent(opts.productId)}/compliance-check`,
      ),
      {
        method: "POST",
        headers: { accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify({ seo_score_min: 70 } satisfies OpenAPIComplianceCheckRequest),
        signal: opts.signal,
      },
    );
  } catch (err) {
    throw new ComplianceApiError("checkProductCompliance: network error", { cause: err });
  }
  const raw = (await readJson(res, "checkProductCompliance")) as
    | RawComplianceResponse
    | RawComplianceResult
    | OpenAPIComplianceCheckResponse;
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
      apiUrl(
        opts.baseUrl,
        `/api/v1/products/${encodeURIComponent(opts.productId)}/seo-suggestions`,
      ),
      {
        method: "POST",
        headers: { accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify({
          keywords: [...(opts.targetKeywords ?? [])],
        } satisfies OpenAPISEOSuggestionRequest),
        signal: opts.signal,
      },
    );
  } catch (err) {
    throw new ComplianceApiError("requestSeoSuggestions: network error", { cause: err });
  }
  if (res.status === 404 || res.status === 501) {
    return { available: false, suggestions: [] };
  }
  const raw = (await readJson(res, "requestSeoSuggestions")) as
    | RawSeoSuggestionsResponse
    | OpenAPISEOSuggestionResponse;
  const legacySuggestions = (raw as RawSeoSuggestionsResponse).suggestions;
  const suggestions = Array.isArray(legacySuggestions)
    ? legacySuggestions.filter((item): item is string => typeof item === "string")
    : "title" in raw
      ? (() => {
          const seo = raw as OpenAPISEOSuggestionResponse;
          return [
            `SEO title: ${seo.title}`,
            `Meta description: ${seo.meta_description}`,
            `Slug: ${seo.slug}`,
            ...seo.reasons,
          ];
        })()
      : [];
  const score =
    "score" in raw && typeof raw.score === "number"
      ? seoScoreFromOverall(
          raw.score,
          raw.score,
          "reasons" in raw && Array.isArray(raw.reasons) ? raw.reasons : [],
        )
      : parseSeoScore((raw as RawSeoSuggestionsResponse).score);
  return {
    available: true,
    score,
    suggestions,
  };
}
