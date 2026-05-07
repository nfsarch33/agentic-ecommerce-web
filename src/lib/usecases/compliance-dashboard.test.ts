import { describe, expect, it, vi } from "vitest";
import { Product } from "@/lib/domain/product";
import type { ComplianceReportSummary, ComplianceResult, ComplianceRule, CustomComplianceRule } from "@/lib/domain/compliance";
import { loadComplianceDashboard, runBulkComplianceCheck } from "./compliance-dashboard";

const product = Product.fromInput({
  id: "p_1",
  sku: "BAND-001",
  title: "Resistance Band Set",
  slug: "resistance-band-set",
  price: { amount: 2495, currency: "AUD" },
  stock: 12,
  description: "Progressive resistance band set with 5 tension levels.",
});

const rule: ComplianceRule = {
  id: "rule_alt_text",
  code: "image.alt_text",
  name: "Image alt text",
  description: "Product images need meaningful alt text.",
  category: "media",
  severity: "warning",
  enabled: true,
};

const result: ComplianceResult = {
  productId: product.id,
  status: "passed",
  score: 92,
  checkedAt: "2026-05-07T04:00:00Z",
  ruleResults: [{ rule, status: "passed", severity: "warning", reason: "Alt text is descriptive." }],
};

const reportSummary: ComplianceReportSummary = {
  tenantId: "tenant_default",
  period: "30d",
  generatedAt: "2026-05-08T00:00:00Z",
  totals: { checks: 1, passed: 1, failed: 0, needsReview: 0 },
  passRate: 100,
  failRate: 0,
  averageScore: 92,
  trends: [{ date: "2026-05-08", passed: 1, failed: 0, needsReview: 0, averageScore: 92 }],
  ruleCoverage: [{ ruleId: rule.id, ruleName: rule.name, checked: 1, passed: 1, failed: 0 }],
};

const customRule: CustomComplianceRule = {
  ...rule,
  tenantId: "tenant_default",
  condition: { field: "description", operator: "does_not_contain", value: "cure" },
  version: 1,
  updatedAt: "2026-05-08T00:00:00Z",
};

describe("loadComplianceDashboard", () => {
  it("loads products, rules, initial compliance results, reporting, and custom tenant rules", async () => {
    const fetchProductsImpl = vi.fn().mockResolvedValue([product]);
    const fetchRulesImpl = vi.fn().mockResolvedValue([rule]);
    const checkProductImpl = vi.fn().mockResolvedValue(result);
    const fetchReportSummaryImpl = vi.fn().mockResolvedValue(reportSummary);
    const fetchCustomRulesImpl = vi.fn().mockResolvedValue([customRule]);

    const dashboard = await loadComplianceDashboard(
      { baseUrl: "http://api.test", tenantId: "tenant_default" },
      { fetchProductsImpl, fetchRulesImpl, checkProductImpl, fetchReportSummaryImpl, fetchCustomRulesImpl },
    );

    expect(dashboard.products).toEqual([product]);
    expect(dashboard.rules).toEqual([rule]);
    expect(dashboard.results[0]?.score).toBe(92);
    expect(dashboard.summary).toEqual({
      total: 1,
      passed: 1,
      failed: 0,
      needsReview: 0,
      averageScore: 92,
    });
    expect(dashboard.reportSummary).toEqual(reportSummary);
    expect(dashboard.customRules).toEqual([customRule]);
    expect(checkProductImpl).toHaveBeenCalledWith(
      expect.objectContaining({ baseUrl: "http://api.test", productId: "p_1", includeSeo: true }),
    );
    expect(fetchReportSummaryImpl).toHaveBeenCalledWith(
      expect.objectContaining({ baseUrl: "http://api.test", tenantId: "tenant_default", period: "30d" }),
    );
  });

  it("keeps the dashboard usable when optional reporting endpoints are unavailable", async () => {
    const dashboard = await loadComplianceDashboard(
      { baseUrl: "http://api.test" },
      {
        fetchProductsImpl: vi.fn().mockResolvedValue([product]),
        fetchRulesImpl: vi.fn().mockResolvedValue([rule]),
        checkProductImpl: vi.fn().mockResolvedValue(result),
        fetchReportSummaryImpl: vi.fn().mockRejectedValue(new Error("not merged yet")),
        fetchCustomRulesImpl: vi.fn().mockRejectedValue(new Error("not merged yet")),
      },
    );

    expect(dashboard.reportSummary).toBeUndefined();
    expect(dashboard.customRules).toEqual([]);
    expect(dashboard.summary.passed).toBe(1);
  });
});

describe("runBulkComplianceCheck", () => {
  it("runs selected product ids and preserves result order", async () => {
    const checkProductImpl = vi
      .fn()
      .mockResolvedValueOnce({ ...result, productId: "p_2", score: 83 })
      .mockResolvedValueOnce({ ...result, productId: "p_1", score: 92 });

    const results = await runBulkComplianceCheck(
      { baseUrl: "http://api.test", productIds: ["p_2", "p_1"] },
      { checkProductImpl },
    );

    expect(results.map((item) => item.productId)).toEqual(["p_2", "p_1"]);
    expect(results.map((item) => item.score)).toEqual([83, 92]);
  });
});
