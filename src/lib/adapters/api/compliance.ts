import {
  ComplianceValidationError,
  createComplianceReportSummary,
  createComplianceResult,
  createComplianceRule,
  createCustomComplianceRule as createDomainCustomComplianceRule,
  createSeoScore,
  type ComplianceReportSummary,
  type ComplianceResult,
  type ComplianceRule,
  type ComplianceRuleCategory,
  type ComplianceSeverity,
  type ComplianceStatus,
  type CustomComplianceRule,
  type CustomComplianceRuleCondition,
  type CustomComplianceRuleInput,
  type SeoScore,
} from "@/lib/domain/compliance";
import type { components } from "./generated/schema";

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

export interface FetchComplianceReportSummaryOptions {
  readonly baseUrl: string;
  readonly tenantId: string;
  readonly period?: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface ExportComplianceReportOptions {
  readonly baseUrl: string;
  readonly tenantId: string;
  readonly format: "csv" | "json";
  readonly period?: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface ComplianceReportExport {
  readonly filename: string;
  readonly mimeType: string;
  readonly content: string;
}

export interface FetchCustomComplianceRulesOptions {
  readonly baseUrl: string;
  readonly tenantId: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface CreateCustomComplianceRuleOptions {
  readonly baseUrl: string;
  readonly rule: Omit<CustomComplianceRuleInput, "id" | "version" | "updatedAt">;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface UpdateCustomComplianceRuleOptions {
  readonly baseUrl: string;
  readonly ruleId: string;
  readonly patch: Partial<Omit<CustomComplianceRuleInput, "id">> & { readonly tenantId: string };
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface DeleteCustomComplianceRuleOptions {
  readonly baseUrl: string;
  readonly tenantId: string;
  readonly ruleId: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface SeoSuggestionsResponse {
  readonly available: boolean;
  readonly score?: SeoScore;
  readonly suggestions: readonly string[];
}

type GeneratedComplianceSummary = components["schemas"]["ComplianceSummary"];
type GeneratedCustomRule = components["schemas"]["ComplianceCustomRule"];
type GeneratedCustomRuleDefinition = components["schemas"]["ComplianceCustomRuleDefinition"];

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

interface RawComplianceReportSummary {
  readonly tenant_id?: unknown;
  readonly tenantId?: unknown;
  readonly total_checks?: unknown;
  readonly passed_checks?: unknown;
  readonly failed_checks?: unknown;
  readonly pass_rate?: unknown;
  readonly rule_stats?: unknown;
  readonly period?: unknown;
  readonly generated_at?: unknown;
  readonly generatedAt?: unknown;
  readonly totals?: {
    readonly checks?: unknown;
    readonly passed?: unknown;
    readonly failed?: unknown;
    readonly needs_review?: unknown;
    readonly needsReview?: unknown;
  };
  readonly average_score?: unknown;
  readonly averageScore?: unknown;
  readonly trends?: unknown;
  readonly rule_coverage?: unknown;
  readonly ruleCoverage?: unknown;
}

interface RawComplianceTrend {
  readonly date?: unknown;
  readonly passed?: unknown;
  readonly failed?: unknown;
  readonly total?: unknown;
  readonly needs_review?: unknown;
  readonly needsReview?: unknown;
  readonly average_score?: unknown;
  readonly averageScore?: unknown;
}

interface RawRuleCoverage {
  readonly rule_id?: unknown;
  readonly ruleId?: unknown;
  readonly rule_name?: unknown;
  readonly ruleName?: unknown;
  readonly checked?: unknown;
  readonly passed?: unknown;
  readonly failed?: unknown;
}

interface RawCustomComplianceRule extends RawComplianceRule {
  readonly tenant_id?: unknown;
  readonly tenantId?: unknown;
  readonly condition?: unknown;
  readonly definition?: unknown;
  readonly version?: unknown;
  readonly updated_at?: unknown;
  readonly updatedAt?: unknown;
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

function parseTrend(raw: unknown) {
  const value = raw as RawComplianceTrend;
  const total = typeof value?.total === "number" ? value.total : undefined;
  const passed = parseNumber(value?.passed, "trend.passed");
  const failed = parseNumber(value?.failed, "trend.failed");
  return {
    date: parseString(value?.date, "trend.date"),
    passed,
    failed,
    needsReview:
      value?.needs_review === undefined && value?.needsReview === undefined
        ? Math.max(0, (total ?? passed + failed) - passed - failed)
        : parseNumber(value?.needs_review ?? value?.needsReview, "trend.needs_review"),
    averageScore:
      value?.average_score === undefined && value?.averageScore === undefined
        ? total && total > 0
          ? Math.round((passed / total) * 100)
          : 0
        : parseNumber(value?.average_score ?? value?.averageScore, "trend.average_score"),
  };
}

function parseCoverage(raw: unknown) {
  const value = raw as RawRuleCoverage;
  return {
    ruleId: parseString(value?.rule_id ?? value?.ruleId, "coverage.rule_id"),
    ruleName: parseString(value?.rule_name ?? value?.ruleName, "coverage.rule_name"),
    checked: parseNumber(value?.checked, "coverage.checked"),
    passed: parseNumber(value?.passed, "coverage.passed"),
    failed: parseNumber(value?.failed, "coverage.failed"),
  };
}

function parseReportSummary(raw: unknown): ComplianceReportSummary {
  const value = raw as RawComplianceReportSummary & Partial<GeneratedComplianceSummary>;
  const totals = value?.totals ?? {
    checks: value.total_checks,
    passed: value.passed_checks,
    failed: value.failed_checks,
    needs_review: 0,
  };
  const trends = value?.trends ?? [];
  const ruleStats = value.rule_stats;
  const backendRuleCoverage =
    ruleStats && typeof ruleStats === "object"
      ? Object.values(
          ruleStats as Record<
            string,
            { rule_id?: string; passed?: number; failed?: number; total?: number }
          >,
        ).map((stat) => ({
          rule_id: stat.rule_id,
          rule_name: stat.rule_id,
          checked: stat.total,
          passed: stat.passed,
          failed: stat.failed,
        }))
      : undefined;
  const ruleCoverage = value?.rule_coverage ?? value?.ruleCoverage ?? backendRuleCoverage ?? [];
  if (!Array.isArray(trends)) throw new ComplianceApiError("report.trends must be an array");
  if (!Array.isArray(ruleCoverage))
    throw new ComplianceApiError("report.rule_coverage must be an array");
  const passRate = typeof value.pass_rate === "number" ? value.pass_rate : undefined;
  const averageScore =
    value.average_score ??
    value.averageScore ??
    (passRate === undefined ? 0 : passRate <= 1 ? passRate * 100 : passRate);
  try {
    return createComplianceReportSummary({
      tenantId: parseString(value?.tenant_id ?? value?.tenantId, "report.tenant_id"),
      period: typeof value?.period === "string" ? value.period : "30d",
      generatedAt:
        typeof (value?.generated_at ?? value?.generatedAt) === "string"
          ? String(value?.generated_at ?? value?.generatedAt)
          : new Date(0).toISOString(),
      totals: {
        checks: parseNumber(totals.checks, "report.totals.checks"),
        passed: parseNumber(totals.passed, "report.totals.passed"),
        failed: parseNumber(totals.failed, "report.totals.failed"),
        needsReview:
          totals.needs_review === undefined && totals.needsReview === undefined
            ? 0
            : parseNumber(totals.needs_review ?? totals.needsReview, "report.totals.needs_review"),
      },
      averageScore: parseNumber(averageScore, "report.average_score"),
      trends: trends.map(parseTrend),
      ruleCoverage: ruleCoverage.map(parseCoverage),
    });
  } catch (err) {
    if (err instanceof ComplianceValidationError || err instanceof ComplianceApiError) {
      throw new ComplianceApiError(`parseReportSummary: ${err.message}`, { cause: err });
    }
    throw err;
  }
}

function parseCondition(raw: unknown): CustomComplianceRuleCondition {
  const value = raw as {
    readonly field?: unknown;
    readonly operator?: unknown;
    readonly value?: unknown;
  };
  return {
    field: parseString(value?.field, "rule.condition.field"),
    operator: parseString(
      value?.operator,
      "rule.condition.operator",
    ) as CustomComplianceRuleCondition["operator"],
    value: parseString(value?.value, "rule.condition.value"),
  };
}

function conditionFromDefinition(raw: unknown): CustomComplianceRuleCondition | undefined {
  const definition = raw as Partial<GeneratedCustomRuleDefinition> | undefined;
  const value = definition?.values?.[0];
  if (!definition?.field || typeof value !== "string") return undefined;
  return { field: definition.field, operator: "does_not_contain", value };
}

function parseCustomRule(raw: unknown): CustomComplianceRule {
  const value = raw as RawCustomComplianceRule & Partial<GeneratedCustomRule>;
  const condition = value?.condition ?? conditionFromDefinition(value?.definition);
  try {
    return createDomainCustomComplianceRule({
      id: parseString(value?.id, "rule.id"),
      tenantId: parseString(value?.tenant_id ?? value?.tenantId, "rule.tenant_id"),
      code: parseString(value?.code ?? value?.id, "rule.code"),
      name: parseString(value?.name, "rule.name"),
      description:
        typeof value?.description === "string" && value.description.trim() !== ""
          ? value.description
          : parseString(value?.name, "rule.description"),
      category: parseString(
        value?.category ?? "content",
        "rule.category",
      ) as ComplianceRuleCategory,
      severity: parseString(value?.severity, "rule.severity") as ComplianceSeverity,
      enabled: parseBoolean(value?.enabled, "rule.enabled"),
      condition: parseCondition(condition),
      version: parseNumber(value?.version, "rule.version"),
      updatedAt: parseString(value?.updated_at ?? value?.updatedAt, "rule.updated_at"),
    });
  } catch (err) {
    if (err instanceof ComplianceValidationError || err instanceof ComplianceApiError) {
      throw new ComplianceApiError(`parseCustomRule: ${err.message}`, { cause: err });
    }
    throw err;
  }
}

function customRulePayload(rule: CustomComplianceRuleInput) {
  return {
    id: rule.code,
    name: rule.name,
    description: rule.description,
    severity: rule.severity,
    enabled: rule.enabled,
    definition: {
      type: "contains_any",
      field: rule.condition.field,
      values: [rule.condition.value],
      fail_reason: rule.description,
    },
  };
}

function customRulePatchPayload(
  patch: Partial<Omit<CustomComplianceRuleInput, "id">> & { readonly tenantId: string },
) {
  return {
    ...(patch.code !== undefined ? { id: patch.code } : {}),
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.severity !== undefined ? { severity: patch.severity } : {}),
    ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
    ...(patch.condition !== undefined
      ? {
          definition: {
            type: "contains_any",
            field: patch.condition.field,
            values: [patch.condition.value],
            fail_reason: patch.description,
          },
        }
      : {}),
  };
}

function query(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  return search.toString();
}

function tenantHeaders(tenantId: string, accept = "application/json"): Record<string, string> {
  return { accept, "X-Tenant-ID": tenantId };
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
        body: JSON.stringify({ include_seo: opts.includeSeo ?? true }),
        signal: opts.signal,
      },
    );
  } catch (err) {
    throw new ComplianceApiError("checkProductCompliance: network error", { cause: err });
  }
  const raw = (await readJson(res, "checkProductCompliance")) as
    | RawComplianceResponse
    | RawComplianceResult;
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

export async function fetchComplianceReportSummary(
  opts: FetchComplianceReportSummaryOptions,
): Promise<ComplianceReportSummary> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(apiUrl(opts.baseUrl, "/api/v1/compliance/reports/summary"), {
      method: "GET",
      headers: tenantHeaders(opts.tenantId),
      signal: opts.signal,
    });
  } catch (err) {
    throw new ComplianceApiError("fetchComplianceReportSummary: network error", { cause: err });
  }
  const raw = (await readJson(res, "fetchComplianceReportSummary")) as
    | { report?: unknown }
    | RawComplianceReportSummary;
  return parseReportSummary("report" in raw ? raw.report : raw);
}

function filenameFromDisposition(value: string | null, fallback: string): string {
  const match = value?.match(/filename="?([^";]+)"?/i);
  return match?.[1] ?? fallback;
}

export async function exportComplianceReport(
  opts: ExportComplianceReportOptions,
): Promise<ComplianceReportExport> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const pathQuery = query({ format: opts.format, period: opts.period });
  let res: Response;
  try {
    res = await fetchImpl(apiUrl(opts.baseUrl, `/api/v1/compliance/reports/export?${pathQuery}`), {
      method: "GET",
      headers: tenantHeaders(
        opts.tenantId,
        opts.format === "csv" ? "text/csv" : "application/json",
      ),
      signal: opts.signal,
    });
  } catch (err) {
    throw new ComplianceApiError("exportComplianceReport: network error", { cause: err });
  }
  if (!res.ok)
    throw new ComplianceApiError(`exportComplianceReport: HTTP ${res.status}`, {
      status: res.status,
    });
  const mimeType = opts.format === "csv" ? "text/csv" : "application/json";
  const content =
    opts.format === "csv" ? await res.text() : JSON.stringify(await res.json(), null, 2);
  return {
    filename: filenameFromDisposition(
      res.headers.get("content-disposition"),
      `compliance-report.${opts.format}`,
    ),
    mimeType,
    content,
  };
}

export async function fetchCustomComplianceRules(
  opts: FetchCustomComplianceRulesOptions,
): Promise<CustomComplianceRule[]> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(apiUrl(opts.baseUrl, "/api/v1/compliance/custom-rules"), {
      method: "GET",
      headers: tenantHeaders(opts.tenantId),
      signal: opts.signal,
    });
  } catch (err) {
    throw new ComplianceApiError("fetchCustomComplianceRules: network error", { cause: err });
  }
  const raw = (await readJson(res, "fetchCustomComplianceRules")) as
    | { rules?: unknown }
    | unknown[];
  const rules = Array.isArray(raw) ? raw : raw.rules;
  if (!Array.isArray(rules)) {
    throw new ComplianceApiError(
      "fetchCustomComplianceRules: response body must include rules array",
    );
  }
  return rules.map(parseCustomRule);
}

export async function createCustomComplianceRule(
  opts: CreateCustomComplianceRuleOptions,
): Promise<CustomComplianceRule> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const rule = createDomainCustomComplianceRule(opts.rule);
  let res: Response;
  try {
    res = await fetchImpl(apiUrl(opts.baseUrl, "/api/v1/compliance/custom-rules"), {
      method: "POST",
      headers: { ...tenantHeaders(rule.tenantId), "content-type": "application/json" },
      body: JSON.stringify(customRulePayload(rule)),
      signal: opts.signal,
    });
  } catch (err) {
    throw new ComplianceApiError("createCustomComplianceRule: network error", { cause: err });
  }
  const raw = (await readJson(res, "createCustomComplianceRule")) as
    | { rule?: unknown }
    | RawCustomComplianceRule;
  return parseCustomRule("rule" in raw ? raw.rule : raw);
}

export async function updateCustomComplianceRule(
  opts: UpdateCustomComplianceRuleOptions,
): Promise<CustomComplianceRule> {
  if (!opts.ruleId) throw new ComplianceApiError("updateCustomComplianceRule: ruleId is required");
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(
      apiUrl(opts.baseUrl, `/api/v1/compliance/custom-rules/${encodeURIComponent(opts.ruleId)}`),
      {
        method: "PUT",
        headers: { ...tenantHeaders(opts.patch.tenantId), "content-type": "application/json" },
        body: JSON.stringify(customRulePatchPayload(opts.patch)),
        signal: opts.signal,
      },
    );
  } catch (err) {
    throw new ComplianceApiError("updateCustomComplianceRule: network error", { cause: err });
  }
  const raw = (await readJson(res, "updateCustomComplianceRule")) as
    | { rule?: unknown }
    | RawCustomComplianceRule;
  return parseCustomRule("rule" in raw ? raw.rule : raw);
}

export async function deleteCustomComplianceRule(
  opts: DeleteCustomComplianceRuleOptions,
): Promise<void> {
  if (!opts.ruleId) throw new ComplianceApiError("deleteCustomComplianceRule: ruleId is required");
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(
      apiUrl(opts.baseUrl, `/api/v1/compliance/custom-rules/${encodeURIComponent(opts.ruleId)}`),
      {
        method: "DELETE",
        headers: tenantHeaders(opts.tenantId),
        signal: opts.signal,
      },
    );
  } catch (err) {
    throw new ComplianceApiError("deleteCustomComplianceRule: network error", { cause: err });
  }
  if (!res.ok)
    throw new ComplianceApiError(`deleteCustomComplianceRule: HTTP ${res.status}`, {
      status: res.status,
    });
}
