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

interface RawComplianceReportSummary {
  readonly tenant_id?: unknown;
  readonly tenantId?: unknown;
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

function parseTrend(raw: unknown) {
  const value = raw as RawComplianceTrend;
  return {
    date: parseString(value?.date, "trend.date"),
    passed: parseNumber(value?.passed, "trend.passed"),
    failed: parseNumber(value?.failed, "trend.failed"),
    needsReview: parseNumber(value?.needs_review ?? value?.needsReview, "trend.needs_review"),
    averageScore: parseNumber(value?.average_score ?? value?.averageScore, "trend.average_score"),
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
  const value = raw as RawComplianceReportSummary;
  const totals = value?.totals ?? {};
  const trends = value?.trends;
  const ruleCoverage = value?.rule_coverage ?? value?.ruleCoverage;
  if (!Array.isArray(trends)) throw new ComplianceApiError("report.trends must be an array");
  if (!Array.isArray(ruleCoverage)) throw new ComplianceApiError("report.rule_coverage must be an array");
  try {
    return createComplianceReportSummary({
      tenantId: parseString(value?.tenant_id ?? value?.tenantId, "report.tenant_id"),
      period: parseString(value?.period, "report.period"),
      generatedAt: parseString(value?.generated_at ?? value?.generatedAt, "report.generated_at"),
      totals: {
        checks: parseNumber(totals.checks, "report.totals.checks"),
        passed: parseNumber(totals.passed, "report.totals.passed"),
        failed: parseNumber(totals.failed, "report.totals.failed"),
        needsReview: parseNumber(totals.needs_review ?? totals.needsReview, "report.totals.needs_review"),
      },
      averageScore: parseNumber(value?.average_score ?? value?.averageScore, "report.average_score"),
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
  const value = raw as { readonly field?: unknown; readonly operator?: unknown; readonly value?: unknown };
  return {
    field: parseString(value?.field, "rule.condition.field"),
    operator: parseString(value?.operator, "rule.condition.operator") as CustomComplianceRuleCondition["operator"],
    value: parseString(value?.value, "rule.condition.value"),
  };
}

function parseCustomRule(raw: unknown): CustomComplianceRule {
  const value = raw as RawCustomComplianceRule;
  try {
    return createDomainCustomComplianceRule({
      id: parseString(value?.id, "rule.id"),
      tenantId: parseString(value?.tenant_id ?? value?.tenantId, "rule.tenant_id"),
      code: parseString(value?.code, "rule.code"),
      name: parseString(value?.name, "rule.name"),
      description: parseString(value?.description, "rule.description"),
      category: parseString(value?.category, "rule.category") as ComplianceRuleCategory,
      severity: parseString(value?.severity, "rule.severity") as ComplianceSeverity,
      enabled: parseBoolean(value?.enabled, "rule.enabled"),
      condition: parseCondition(value?.condition),
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
    tenant_id: rule.tenantId,
    code: rule.code,
    name: rule.name,
    description: rule.description,
    category: rule.category,
    severity: rule.severity,
    enabled: rule.enabled,
    condition: rule.condition,
  };
}

function customRulePatchPayload(patch: Partial<Omit<CustomComplianceRuleInput, "id">> & { readonly tenantId: string }) {
  return {
    tenant_id: patch.tenantId,
    ...(patch.code !== undefined ? { code: patch.code } : {}),
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.category !== undefined ? { category: patch.category } : {}),
    ...(patch.severity !== undefined ? { severity: patch.severity } : {}),
    ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
    ...(patch.condition !== undefined ? { condition: patch.condition } : {}),
  };
}

function query(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  return search.toString();
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

export async function fetchComplianceReportSummary(
  opts: FetchComplianceReportSummaryOptions,
): Promise<ComplianceReportSummary> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const pathQuery = query({ tenant_id: opts.tenantId, period: opts.period ?? "30d" });
  let res: Response;
  try {
    res = await fetchImpl(apiUrl(opts.baseUrl, `/api/v1/compliance/reports/summary?${pathQuery}`), {
      method: "GET",
      headers: { accept: "application/json" },
      signal: opts.signal,
    });
  } catch (err) {
    throw new ComplianceApiError("fetchComplianceReportSummary: network error", { cause: err });
  }
  const raw = (await readJson(res, "fetchComplianceReportSummary")) as { report?: unknown } | RawComplianceReportSummary;
  return parseReportSummary("report" in raw ? raw.report : raw);
}

function filenameFromDisposition(value: string | null, fallback: string): string {
  const match = value?.match(/filename="?([^";]+)"?/i);
  return match?.[1] ?? fallback;
}

export async function exportComplianceReport(opts: ExportComplianceReportOptions): Promise<ComplianceReportExport> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const pathQuery = query({ tenant_id: opts.tenantId, format: opts.format, period: opts.period ?? "30d" });
  let res: Response;
  try {
    res = await fetchImpl(apiUrl(opts.baseUrl, `/api/v1/compliance/reports/export?${pathQuery}`), {
      method: "GET",
      headers: { accept: opts.format === "csv" ? "text/csv" : "application/json" },
      signal: opts.signal,
    });
  } catch (err) {
    throw new ComplianceApiError("exportComplianceReport: network error", { cause: err });
  }
  if (!res.ok) throw new ComplianceApiError(`exportComplianceReport: HTTP ${res.status}`, { status: res.status });
  const mimeType = opts.format === "csv" ? "text/csv" : "application/json";
  const content = opts.format === "csv" ? await res.text() : JSON.stringify(await res.json(), null, 2);
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
    res = await fetchImpl(
      apiUrl(opts.baseUrl, `/api/v1/compliance/custom-rules?${query({ tenant_id: opts.tenantId })}`),
      {
        method: "GET",
        headers: { accept: "application/json" },
        signal: opts.signal,
      },
    );
  } catch (err) {
    throw new ComplianceApiError("fetchCustomComplianceRules: network error", { cause: err });
  }
  const raw = (await readJson(res, "fetchCustomComplianceRules")) as { rules?: unknown } | unknown[];
  const rules = Array.isArray(raw) ? raw : raw.rules;
  if (!Array.isArray(rules)) {
    throw new ComplianceApiError("fetchCustomComplianceRules: response body must include rules array");
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
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify(customRulePayload(rule)),
      signal: opts.signal,
    });
  } catch (err) {
    throw new ComplianceApiError("createCustomComplianceRule: network error", { cause: err });
  }
  const raw = (await readJson(res, "createCustomComplianceRule")) as { rule?: unknown } | RawCustomComplianceRule;
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
        method: "PATCH",
        headers: { accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify(customRulePatchPayload(opts.patch)),
        signal: opts.signal,
      },
    );
  } catch (err) {
    throw new ComplianceApiError("updateCustomComplianceRule: network error", { cause: err });
  }
  const raw = (await readJson(res, "updateCustomComplianceRule")) as { rule?: unknown } | RawCustomComplianceRule;
  return parseCustomRule("rule" in raw ? raw.rule : raw);
}

export async function deleteCustomComplianceRule(opts: DeleteCustomComplianceRuleOptions): Promise<void> {
  if (!opts.ruleId) throw new ComplianceApiError("deleteCustomComplianceRule: ruleId is required");
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(
      apiUrl(
        opts.baseUrl,
        `/api/v1/compliance/custom-rules/${encodeURIComponent(opts.ruleId)}?${query({ tenant_id: opts.tenantId })}`,
      ),
      {
        method: "DELETE",
        headers: { accept: "application/json" },
        signal: opts.signal,
      },
    );
  } catch (err) {
    throw new ComplianceApiError("deleteCustomComplianceRule: network error", { cause: err });
  }
  if (!res.ok) throw new ComplianceApiError(`deleteCustomComplianceRule: HTTP ${res.status}`, { status: res.status });
}
