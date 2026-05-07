import { describe, expect, it } from "vitest";
import {
  AIContentValidationError,
  createAISuggestion,
  createQualityScore,
  qualityScoreLabel,
  selectLatestSuggestion,
} from "./ai-description";

const score = {
  readability: 82,
  seo: 76,
  tone: 91,
  length: 73,
  factual: 88,
};

describe("AI description domain", () => {
  it("normalizes quality score dimensions and computes rounded overall score", () => {
    const suggestion = createAISuggestion({
      id: "sug_1",
      productId: "p_1",
      description: "A polished product description.",
      status: "generated",
      qualityScore: score,
      createdAt: "2026-05-07T04:00:00Z",
    });

    expect(suggestion.qualityScore?.overall).toBe(82);
    expect(suggestion.qualityScore?.breakdown.seo).toBe(76);
    expect(qualityScoreLabel(suggestion.qualityScore)).toBe("Strong");
  });

  it("rejects empty descriptions and out-of-range quality scores", () => {
    expect(() =>
      createAISuggestion({
        id: "sug_1",
        productId: "p_1",
        description: "   ",
        status: "generated",
        qualityScore: score,
      }),
    ).toThrow(AIContentValidationError);

    expect(() =>
      createAISuggestion({
        id: "sug_1",
        productId: "p_1",
        description: "Valid description",
        status: "generated",
        qualityScore: { ...score, factual: 101 },
      }),
    ).toThrow(AIContentValidationError);
  });

  it("selects the latest non-rejected suggestion", () => {
    const older = createAISuggestion({
      id: "sug_old",
      productId: "p_1",
      description: "Older suggestion",
      status: "generated",
      qualityScore: score,
      createdAt: "2026-05-07T03:00:00Z",
    });
    const rejectedLatest = createAISuggestion({
      id: "sug_rejected",
      productId: "p_1",
      description: "Rejected suggestion",
      status: "rejected",
      qualityScore: score,
      createdAt: "2026-05-07T05:00:00Z",
    });

    expect(selectLatestSuggestion([older, rejectedLatest])?.id).toBe("sug_old");
  });

  it("labels unavailable, weak, and needs-work quality scores", () => {
    expect(qualityScoreLabel(undefined)).toBe("Unavailable");
    expect(qualityScoreLabel(createQualityScore({ ...score, overall: 42 }))).toBe("Weak");
    expect(qualityScoreLabel(createQualityScore({ ...score, overall: 70 }))).toBe("Needs work");
  });

  it("handles suggestions without timestamps when selecting an active suggestion", () => {
    const undated = createAISuggestion({
      id: "sug_undated",
      productId: "p_1",
      description: "Undated suggestion",
      status: "generated",
      qualityScore: score,
    });

    expect(selectLatestSuggestion([undated])?.id).toBe("sug_undated");
    expect(selectLatestSuggestion([])).toBeUndefined();
  });
});
