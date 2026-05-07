import { describe, expect, it, vi } from "vitest";
import {
  checkProductCompliance,
  ComplianceApiError,
  createCustomComplianceRule,
  deleteCustomComplianceRule,
  exportComplianceReport,
  fetchComplianceReportSummary,
  fetchComplianceRules,
  fetchCustomComplianceRules,
  requestSeoSuggestions,
  updateCustomComplianceRule,
} from "./compliance";

function jsonResponse(body: unknown, init: ResponseInit = { status: 200 }): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    ...init,
  });
}

const rawRule = {
  id: "rule_title_claims",
  code: "title.claims",
  name: "No exaggerated claims",
  description: "Product copy must avoid unsupported superlatives.",
  category: "content",
  severity: "critical",
  enabled: true,
};

const rawResult = {
  product_id: "p_1",
  status: "failed",
  score: 62,
  checked_at: "2026-05-07T04:00:00Z",
  rules: [
    {
      rule: rawRule,
      status: "failed",
      severity: "critical",
      reason: "Title claims the product is guaranteed to cure pain.",
    },
  ],
  seo_score: {
    overall: 71,
    title: 80,
    meta_description: 70,
    slug: 85,
    keyword_density: 60,
    image_alt_text: 60,
    recommendations: ["Use the target keyword in the meta description."],
  },
};

describe("fetchComplianceRules", () => {
  it("fetches and parses the compliance rules contract", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ rules: [rawRule] }));

    const rules = await fetchComplianceRules({ baseUrl: "http://api.test", fetchImpl: mockFetch });

    expect(rules).toHaveLength(1);
    expect(rules[0]?.severity).toBe("critical");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/compliance/rules",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("wraps malformed rule payloads", async () => {
    await expect(
      fetchComplianceRules({
        baseUrl: "http://api.test",
        fetchImpl: vi.fn().mockResolvedValue(jsonResponse({ rules: [{ id: "" }] })),
      }),
    ).rejects.toBeInstanceOf(ComplianceApiError);
  });

  it("accepts a bare rules array from early backend builds", async () => {
    const rules = await fetchComplianceRules({
      baseUrl: "http://api.test",
      fetchImpl: vi.fn().mockResolvedValue(jsonResponse([rawRule])),
    });

    expect(rules[0]?.id).toBe("rule_title_claims");
  });

  it("wraps HTTP and network failures", async () => {
    await expect(
      fetchComplianceRules({
        baseUrl: "http://api.test",
        fetchImpl: vi.fn().mockResolvedValue(jsonResponse({ error: "boom" }, { status: 500 })),
      }),
    ).rejects.toMatchObject({ status: 500 });

    await expect(
      fetchComplianceRules({
        baseUrl: "http://api.test",
        fetchImpl: vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
      }),
    ).rejects.toBeInstanceOf(ComplianceApiError);
  });
});

describe("checkProductCompliance", () => {
  it("posts a product compliance check and parses rule and SEO results", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ result: rawResult }, { status: 202 }));

    const result = await checkProductCompliance({
      baseUrl: "http://api.test",
      productId: "p_1",
      includeSeo: true,
      fetchImpl: mockFetch,
    });

    expect(result.productId).toBe("p_1");
    expect(result.status).toBe("failed");
    expect(result.seoScore?.overall).toBe(71);
    expect(result.ruleResults[0]?.reason).toContain("guaranteed");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/products/p_1/compliance-check",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "content-type": "application/json" }),
        body: JSON.stringify({ include_seo: true }),
      }),
    );
  });

  it("rejects empty product ids before posting", async () => {
    const mockFetch = vi.fn();

    await expect(
      checkProductCompliance({
        baseUrl: "http://api.test",
        productId: "",
        fetchImpl: mockFetch,
      }),
    ).rejects.toBeInstanceOf(ComplianceApiError);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("accepts an unwrapped camelCase result without SEO score", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      jsonResponse({
        productId: "p_1",
        status: "needs_review",
        score: 74,
        checkedAt: "2026-05-07T04:00:00Z",
        ruleResults: [
          {
            rule: { ...rawRule, severity: "warning" },
            status: "needs_review",
            severity: "warning",
            reason: "Meta description is close to the minimum length.",
          },
        ],
      }),
    );

    const result = await checkProductCompliance({
      baseUrl: "http://api.test",
      productId: "p_1",
      includeSeo: false,
      fetchImpl: mockFetch,
    });

    expect(result.status).toBe("needs_review");
    expect(result.seoScore).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/products/p_1/compliance-check",
      expect.objectContaining({ body: JSON.stringify({ include_seo: false }) }),
    );
  });
});

describe("requestSeoSuggestions", () => {
  it("posts to the optional SEO suggestions endpoint and parses score guidance", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      jsonResponse({
        score: rawResult.seo_score,
        suggestions: ["Shorten the SEO title.", "Add alt text to the hero image."],
      }),
    );

    const response = await requestSeoSuggestions({
      baseUrl: "http://api.test",
      productId: "p_1",
      targetKeywords: ["resistance bands"],
      fetchImpl: mockFetch,
    });

    expect(response.available).toBe(true);
    expect(response.score?.overall).toBe(71);
    expect(response.suggestions).toContain("Shorten the SEO title.");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/products/p_1/seo-suggestions",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ target_keywords: ["resistance bands"] }),
      }),
    );
  });

  it("reports the optional SEO suggestions endpoint as unavailable on 404/501", async () => {
    const response = await requestSeoSuggestions({
      baseUrl: "http://api.test",
      productId: "p_1",
      fetchImpl: vi.fn().mockResolvedValue(jsonResponse({ error: "not_found" }, { status: 404 })),
    });

    expect(response).toEqual({ available: false, suggestions: [] });
  });

  it("handles supported SEO responses without a suggestions array", async () => {
    const response = await requestSeoSuggestions({
      baseUrl: "http://api.test",
      productId: "p_1",
      fetchImpl: vi.fn().mockResolvedValue(jsonResponse({ score: rawResult.seo_score })),
    });

    expect(response.available).toBe(true);
    expect(response.suggestions).toEqual([]);
  });
});

describe("compliance reporting API", () => {
  const rawReport = {
    tenant_id: "tenant_default",
    period: "30d",
    generated_at: "2026-05-08T00:00:00Z",
    totals: { checks: 10, passed: 7, failed: 2, needs_review: 1 },
    average_score: 83,
    trends: [{ date: "2026-05-01", passed: 3, failed: 1, needs_review: 0, average_score: 84 }],
    rule_coverage: [
      { rule_id: "rule_alt_text", rule_name: "Image alt text", checked: 10, passed: 8, failed: 2 },
    ],
  };

  it("fetches report summaries scoped to the active tenant", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ report: rawReport }));

    const report = await fetchComplianceReportSummary({
      baseUrl: "http://api.test",
      tenantId: "tenant_default",
      period: "30d",
      fetchImpl: mockFetch,
    });

    expect(report.passRate).toBe(70);
    expect(report.ruleCoverage[0]?.ruleName).toBe("Image alt text");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/compliance/reports/summary?tenant_id=tenant_default&period=30d",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("exports CSV and JSON compliance reports", async () => {
    const csvFetch = vi.fn().mockResolvedValue(
      new Response("rule,passed\nalt_text,8\n", {
        headers: { "content-type": "text/csv", "content-disposition": 'attachment; filename="report.csv"' },
      }),
    );

    const csv = await exportComplianceReport({
      baseUrl: "http://api.test",
      tenantId: "tenant_default",
      format: "csv",
      fetchImpl: csvFetch,
    });

    expect(csv.filename).toBe("report.csv");
    expect(csv.content).toContain("alt_text");

    const json = await exportComplianceReport({
      baseUrl: "http://api.test",
      tenantId: "tenant_default",
      format: "json",
      fetchImpl: vi.fn().mockResolvedValue(jsonResponse({ report: rawReport })),
    });

    expect(json.mimeType).toBe("application/json");
    expect(json.content).toContain("tenant_default");
  });
});

describe("custom compliance rule API", () => {
  const rawCustomRule = {
    id: "custom_health_claims",
    tenant_id: "tenant_default",
    code: "copy.health_claims",
    name: "Health claim guardrail",
    description: "Reject unsupported medical claims.",
    category: "legal",
    severity: "critical",
    enabled: true,
    condition: { field: "description", operator: "does_not_contain", value: "cure" },
    version: 1,
    updated_at: "2026-05-08T00:00:00Z",
  };

  it("lists and creates custom compliance rules for a tenant", async () => {
    const listFetch = vi.fn().mockResolvedValue(jsonResponse({ rules: [rawCustomRule] }));
    const rules = await fetchCustomComplianceRules({
      baseUrl: "http://api.test",
      tenantId: "tenant_default",
      fetchImpl: listFetch,
    });

    expect(rules[0]?.condition.field).toBe("description");
    expect(listFetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/compliance/custom-rules?tenant_id=tenant_default",
      expect.objectContaining({ method: "GET" }),
    );

    const createFetch = vi.fn().mockResolvedValue(jsonResponse({ rule: rawCustomRule }, { status: 201 }));
    await createCustomComplianceRule({
      baseUrl: "http://api.test",
      rule: {
        tenantId: "tenant_default",
        code: "copy.health_claims",
        name: "Health claim guardrail",
        description: "Reject unsupported medical claims.",
        category: "legal",
        severity: "critical",
        enabled: true,
        condition: { field: "description", operator: "does_not_contain", value: "cure" },
      },
      fetchImpl: createFetch,
    });

    expect(createFetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/compliance/custom-rules",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          tenant_id: "tenant_default",
          code: "copy.health_claims",
          name: "Health claim guardrail",
          description: "Reject unsupported medical claims.",
          category: "legal",
          severity: "critical",
          enabled: true,
          condition: { field: "description", operator: "does_not_contain", value: "cure" },
        }),
      }),
    );
  });

  it("updates and deletes custom compliance rules", async () => {
    const updateFetch = vi.fn().mockResolvedValue(jsonResponse({ rule: { ...rawCustomRule, enabled: false } }));
    const rule = await updateCustomComplianceRule({
      baseUrl: "http://api.test",
      ruleId: rawCustomRule.id,
      patch: { tenantId: "tenant_default", enabled: false },
      fetchImpl: updateFetch,
    });

    expect(rule.enabled).toBe(false);
    expect(updateFetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/compliance/custom-rules/custom_health_claims",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ tenant_id: "tenant_default", enabled: false }) }),
    );

    const deleteFetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    await deleteCustomComplianceRule({
      baseUrl: "http://api.test",
      tenantId: "tenant_default",
      ruleId: rawCustomRule.id,
      fetchImpl: deleteFetch,
    });

    expect(deleteFetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/compliance/custom-rules/custom_health_claims?tenant_id=tenant_default",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
