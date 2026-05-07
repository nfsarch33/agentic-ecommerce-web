import {
  checkProductCompliance,
  fetchComplianceReportSummary,
  fetchComplianceRules,
  fetchCustomComplianceRules,
  type CheckProductComplianceOptions,
  type FetchComplianceReportSummaryOptions,
  type FetchComplianceRulesOptions,
  type FetchCustomComplianceRulesOptions,
} from "@/lib/adapters/api/compliance";
import { fetchProducts, type FetchProductsOptions } from "@/lib/adapters/api/products";
import {
  complianceSummary,
  type ComplianceReportSummary,
  type ComplianceResult,
  type ComplianceRule,
  type ComplianceSummary,
  type CustomComplianceRule,
} from "@/lib/domain/compliance";
import type { Product } from "@/lib/domain/product";

export interface LoadComplianceDashboardInput {
  readonly baseUrl: string;
  readonly tenantId?: string;
  readonly period?: string;
}

export interface LoadComplianceDashboardResult {
  readonly products: readonly Product[];
  readonly rules: readonly ComplianceRule[];
  readonly results: readonly ComplianceResult[];
  readonly summary: ComplianceSummary;
  readonly reportSummary?: ComplianceReportSummary;
  readonly customRules?: readonly CustomComplianceRule[];
}

export interface LoadComplianceDashboardDeps {
  readonly fetchProductsImpl?: (opts: FetchProductsOptions) => Promise<readonly Product[]>;
  readonly fetchRulesImpl?: (opts: FetchComplianceRulesOptions) => Promise<readonly ComplianceRule[]>;
  readonly checkProductImpl?: (opts: CheckProductComplianceOptions) => Promise<ComplianceResult>;
  readonly fetchReportSummaryImpl?: (opts: FetchComplianceReportSummaryOptions) => Promise<ComplianceReportSummary>;
  readonly fetchCustomRulesImpl?: (opts: FetchCustomComplianceRulesOptions) => Promise<readonly CustomComplianceRule[]>;
}

export interface RunBulkComplianceCheckInput {
  readonly baseUrl: string;
  readonly productIds: readonly string[];
}

export interface RunBulkComplianceCheckDeps {
  readonly checkProductImpl?: (opts: CheckProductComplianceOptions) => Promise<ComplianceResult>;
}

export async function loadComplianceDashboard(
  input: LoadComplianceDashboardInput,
  deps: LoadComplianceDashboardDeps = {},
): Promise<LoadComplianceDashboardResult> {
  const fetchProductsImpl = deps.fetchProductsImpl ?? fetchProducts;
  const fetchRulesImpl = deps.fetchRulesImpl ?? fetchComplianceRules;
  const checkProductImpl = deps.checkProductImpl ?? checkProductCompliance;
  const fetchReportSummaryImpl = deps.fetchReportSummaryImpl ?? fetchComplianceReportSummary;
  const fetchCustomRulesImpl = deps.fetchCustomRulesImpl ?? fetchCustomComplianceRules;
  const tenantId = input.tenantId ?? "tenant_default";
  const [products, rules, reportSummary, customRules] = await Promise.all([
    fetchProductsImpl({ baseUrl: input.baseUrl }),
    fetchRulesImpl({ baseUrl: input.baseUrl }),
    fetchReportSummaryImpl({ baseUrl: input.baseUrl, tenantId, period: input.period ?? "30d" }).catch(() => undefined),
    fetchCustomRulesImpl({ baseUrl: input.baseUrl, tenantId }).catch(() => []),
  ]);
  const results = await Promise.all(
    products.map((product) =>
      checkProductImpl({ baseUrl: input.baseUrl, productId: product.id, includeSeo: true }),
    ),
  );

  return {
    products,
    rules,
    results,
    summary: complianceSummary(results),
    reportSummary,
    customRules,
  };
}

export async function runBulkComplianceCheck(
  input: RunBulkComplianceCheckInput,
  deps: RunBulkComplianceCheckDeps = {},
): Promise<ComplianceResult[]> {
  const checkProductImpl = deps.checkProductImpl ?? checkProductCompliance;
  return Promise.all(
    input.productIds.map((productId) =>
      checkProductImpl({ baseUrl: input.baseUrl, productId, includeSeo: true }),
    ),
  );
}
