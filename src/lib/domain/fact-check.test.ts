import { describe, expect, it } from "vitest";
import {
  FactCheckValidationError,
  confidenceLabel,
  createFactCheckResult,
  summarizeFactCheckResult,
} from "./fact-check";

const evidence = {
  id: "ev_1",
  title: "Resistance Band Product Manual",
  uri: "s3://rag-docs/resistance-band-manual.md",
  excerpt: "The set includes five latex bands with progressive tension levels.",
  similarity: 0.91,
  sourceType: "manual",
  metadata: { page: 2, section: "Specifications" },
};

describe("fact-check domain", () => {
  it("normalizes claims, evidence sources, and factual confidence labels", () => {
    const result = createFactCheckResult({
      id: "fc_1",
      productId: "p_1",
      suggestionId: "sug_1",
      overallConfidence: 86,
      status: "supported",
      checkedAt: "2026-05-08T01:00:00Z",
      claims: [
        {
          id: "claim_1",
          text: "The resistance band set includes five tension levels.",
          confidence: 92,
          verdict: "supported",
          evidence: [evidence],
        },
        {
          id: "claim_2",
          text: "The bands cure chronic pain.",
          confidence: 28,
          verdict: "contradicted",
          evidence: [{ ...evidence, id: "ev_2", excerpt: "No therapeutic claims are made for this product." }],
          explanation: "Source material does not support medical claims.",
        },
        {
          id: "claim_3",
          text: "Warranty coverage is available.",
          confidence: 46,
          verdict: "ambiguous",
          evidence: [],
        },
      ],
    });

    expect(result.overallConfidence.label).toBe("High");
    expect(result.claims[0]?.confidence.label).toBe("High");
    expect(result.claims[1]?.confidence.label).toBe("Low");
    expect(result.claims[0]?.evidence[0]?.metadata).toEqual({ page: 2, section: "Specifications" });
    expect(summarizeFactCheckResult(result)).toEqual({
      supported: 1,
      contradicted: 1,
      insufficient: 1,
      total: 3,
    });
  });

  it("labels confidence thresholds consistently", () => {
    expect(confidenceLabel({ score: 90, label: "High" })).toBe("High");
    expect(confidenceLabel({ score: 70, label: "Medium" })).toBe("Medium");
    expect(confidenceLabel({ score: 45, label: "Low" })).toBe("Low");
  });

  it("rejects empty claims and out-of-range evidence similarity", () => {
    expect(() =>
      createFactCheckResult({
        id: "fc_1",
        productId: "p_1",
        overallConfidence: 75,
        status: "supported",
        claims: [
          {
            id: "claim_1",
            text: " ",
            confidence: 91,
            verdict: "supported",
            evidence: [evidence],
          },
        ],
      }),
    ).toThrow(FactCheckValidationError);

    expect(() =>
      createFactCheckResult({
        id: "fc_1",
        productId: "p_1",
        overallConfidence: 75,
        status: "supported",
        claims: [
          {
            id: "claim_1",
            text: "Valid claim",
            confidence: 91,
            verdict: "supported",
            evidence: [{ ...evidence, similarity: 1.2 }],
          },
        ],
      }),
    ).toThrow(FactCheckValidationError);
  });
});
