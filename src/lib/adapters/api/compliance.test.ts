import { describe, expect, it, vi } from "vitest";
import {
  checkProductCompliance,
  ComplianceApiError,
  fetchComplianceRules,
  requestSeoSuggestions,
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
