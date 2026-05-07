import { describe, expect, it } from "vitest";
import {
  complianceResultLabel,
  complianceSummary,
  createComplianceResult,
  createMediaAsset,
  createSeoScore,
  seoScoreLabel,
  type ComplianceRule,
} from "./compliance";

const rules: ComplianceRule[] = [
  {
    id: "rule_title_claims",
    code: "title.claims",
    name: "No exaggerated claims",
    description: "Product copy must avoid unsupported superlatives.",
    category: "content",
    severity: "critical",
    enabled: true,
  },
  {
    id: "rule_alt_text",
    code: "image.alt_text",
    name: "Image alt text",
    description: "Product images need meaningful alt text.",
    category: "media",
    severity: "error",
    enabled: true,
  },
];

describe("SeoScore", () => {
  it("computes an overall score when the backend omits one", () => {
    const score = createSeoScore({
      title: 90,
      metaDescription: 80,
      slug: 70,
      keywordDensity: 60,
      imageAltText: 100,
      recommendations: ["Add the primary keyword earlier."],
    });

    expect(score.overall).toBe(80);
    expect(seoScoreLabel(score)).toBe("Strong");
    expect(score.recommendations).toContain("Add the primary keyword earlier.");
  });

  it("rejects SEO dimensions outside the 0-100 range", () => {
    expect(() =>
      createSeoScore({
        title: 101,
        metaDescription: 80,
        slug: 70,
        keywordDensity: 60,
        imageAltText: 100,
      }),
    ).toThrow(/between 0 and 100/);
  });

  it("labels weak, needs-work, and unavailable SEO scores", () => {
    expect(seoScoreLabel(undefined)).toBe("Unavailable");
    expect(
      seoScoreLabel(
        createSeoScore({
          overall: 40,
          title: 40,
          metaDescription: 40,
          slug: 40,
          keywordDensity: 40,
          imageAltText: 40,
        }),
      ),
    ).toBe("Weak");
    expect(
      seoScoreLabel(
        createSeoScore({
          overall: 61,
          title: 61,
          metaDescription: 61,
          slug: 61,
          keywordDensity: 61,
          imageAltText: 61,
        }),
      ),
    ).toBe("Needs work");
  });
});

describe("ComplianceResult", () => {
  it("marks failed results when a critical rule fails and summarizes the batch", () => {
    const failed = createComplianceResult({
      productId: "p_1",
      status: "failed",
      score: 62,
      checkedAt: "2026-05-07T04:00:00Z",
      ruleResults: [
        {
          rule: rules[0]!,
          status: "failed",
          severity: "critical",
          reason: "Title claims the product is guaranteed to cure pain.",
        },
        {
          rule: rules[1]!,
          status: "passed",
          severity: "error",
          reason: "Alt text is descriptive.",
        },
      ],
    });
    const passed = createComplianceResult({
      productId: "p_2",
      status: "passed",
      score: 91,
      checkedAt: "2026-05-07T04:01:00Z",
      ruleResults: [],
    });

    expect(complianceResultLabel(failed)).toBe("Fail");
    expect(complianceSummary([failed, passed])).toEqual({
      total: 2,
      passed: 1,
      failed: 1,
      needsReview: 0,
      averageScore: 77,
    });
  });

  it("rejects blank product ids", () => {
    expect(() =>
      createComplianceResult({
        productId: " ",
        status: "passed",
        score: 88,
        checkedAt: "2026-05-07T04:00:00Z",
        ruleResults: [],
      }),
    ).toThrow(/productId/);
  });

  it("labels review results and summarizes empty batches", () => {
    expect(complianceResultLabel({ status: "needs_review" })).toBe("Review");
    expect(complianceSummary([])).toEqual({
      total: 0,
      passed: 0,
      failed: 0,
      needsReview: 0,
      averageScore: 0,
    });
  });
});

describe("MediaAsset", () => {
  it("creates a preview asset and reports missing alt text", () => {
    const asset = createMediaAsset({
      id: "asset_1",
      fileName: "hero.png",
      mimeType: "image/png",
      sizeBytes: 450_000,
      previewUrl: "blob:http://localhost/hero",
      altText: "  ",
      width: 2200,
      height: 1400,
    });

    expect(asset.optimization.format).toBe("image/webp");
    expect(asset.optimization.maxWidth).toBe(1600);
    expect(asset.altTextStatus).toBe("missing");
  });

  it("flags very short alt text separately from valid alt text", () => {
    expect(
      createMediaAsset({
        id: "asset_2",
        fileName: "hero.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1,
        previewUrl: "blob:http://localhost/hero-2",
        altText: "short",
      }).altTextStatus,
    ).toBe("too_short");
    expect(
      createMediaAsset({
        id: "asset_3",
        fileName: "hero.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1,
        previewUrl: "blob:http://localhost/hero-3",
        altText: "Resistance band kit on a gym mat",
      }).altTextStatus,
    ).toBe("valid");
  });
});
