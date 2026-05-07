import {
  checkProductCompliance,
  fetchComplianceRules,
  type CheckProductComplianceOptions,
  type FetchComplianceRulesOptions,
} from "@/lib/adapters/api/compliance";
import { fetchProducts, type FetchProductsOptions } from "@/lib/adapters/api/products";
import {
  complianceSummary,
  type ComplianceResult,
  type ComplianceRule,
  type ComplianceSummary,
} from "@/lib/domain/compliance";
import type { Product } from "@/lib/domain/product";

export interface LoadComplianceDashboardInput {
  readonly baseUrl: string;
}

export interface LoadComplianceDashboardResult {
  readonly products: readonly Product[];
  readonly rules: readonly ComplianceRule[];
  readonly results: readonly ComplianceResult[];
  readonly summary: ComplianceSummary;
}

export interface LoadComplianceDashboardDeps {
  readonly fetchProductsImpl?: (opts: FetchProductsOptions) => Promise<readonly Product[]>;
  readonly fetchRulesImpl?: (opts: FetchComplianceRulesOptions) => Promise<readonly ComplianceRule[]>;
  readonly checkProductImpl?: (opts: CheckProductComplianceOptions) => Promise<ComplianceResult>;
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
  const [products, rules] = await Promise.all([
    fetchProductsImpl({ baseUrl: input.baseUrl }),
    fetchRulesImpl({ baseUrl: input.baseUrl }),
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
