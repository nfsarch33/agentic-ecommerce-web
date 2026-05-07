import { describe, expect, it, vi } from "vitest";
import { AIContentApiError, generateDescription, getAISuggestions } from "./ai-content";

function jsonResponse(body: unknown, init: ResponseInit = { status: 200 }): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    ...init,
  });
}

const rawSuggestion = {
  product_id: "p_1",
  description: "A durable resistance band set for progressive strength training.",
  seo_title: "Resistance Band Set for Strength",
  meta_description: "Build strength with a durable resistance band set.",
  score: 84,
  pass: true,
  tokens_used: 120,
  evaluation: {
    score: 84,
    pass: true,
    readability_score: 82,
    keyword_density: { "resistance band set": 4.5 },
    tone: { style: "professional", pass: true, issues: [] },
    length: { word_count: 18, max_words: 120, within_limit: true },
    factual_issues: [],
  },
};

describe("generateDescription", () => {
  it("posts to the backend content-agent endpoint and parses a direct ContentSuggestion", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse(rawSuggestion));

    const suggestion = await generateDescription({
      baseUrl: "http://api.test",
      productId: "p_1",
      prompt: "Rewrite for SEO",
      style: "professional",
      language: "en-AU",
      maxWords: 120,
      keywords: ["resistance band set"],
      fetchImpl: mockFetch,
    });

    expect(suggestion.description).toContain("resistance band");
    expect(suggestion.qualityScore?.overall).toBe(84);
    expect(suggestion.qualityScore?.breakdown.factual).toBe(100);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/products/p_1/generate-description",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "content-type": "application/json" }),
        body: JSON.stringify({
          style: "professional",
          language: "en-AU",
          max_words: 120,
          keywords: ["resistance band set"],
        }),
      }),
    );
  });

  it("falls back to the existing BFF describe route only when explicitly allowed", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: "not_found" }, { status: 404 }))
      .mockResolvedValueOnce(jsonResponse({ description: "Fallback bridge description" }));

    const suggestion = await generateDescription({
      baseUrl: "http://api.test",
      productId: "p_1",
      prompt: "Describe it",
      allowBffFallback: true,
      fallbackBffBaseUrl: "",
      fetchImpl: mockFetch,
    });

    expect(suggestion.description).toBe("Fallback bridge description");
    expect(suggestion.source).toBe("bff_fallback");
    expect(mockFetch).toHaveBeenLastCalledWith(
      "/api/ai-describe",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ productId: "p_1", prompt: "Describe it" }),
      }),
    );
  });

  it("does not use BFF fallback when the caller disables it", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ error: "not_found" }, { status: 404 }));

    await expect(
      generateDescription({
        baseUrl: "http://api.test",
        productId: "p_1",
        prompt: "Describe it",
        allowBffFallback: false,
        fetchImpl: mockFetch,
      }),
    ).rejects.toBeInstanceOf(AIContentApiError);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("uses stable generated ids for backend suggestions that do not include ids", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse(rawSuggestion));

    const suggestion = await generateDescription({
      baseUrl: "http://api.test",
      productId: "p_1",
      prompt: "Describe it",
      fetchImpl: mockFetch,
    });

    expect(suggestion.id).toBe("backend-p_1");
    expect(suggestion.status).toBe("generated");
  });

  it("maps failing backend quality dimensions into operator notes", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      jsonResponse({
        ...rawSuggestion,
        pass: false,
        score: 52,
        evaluation: {
          ...rawSuggestion.evaluation,
          pass: false,
          keyword_density: {},
          tone: { style: "professional", pass: false, issues: ["professional tone is too casual"] },
          length: { word_count: 180, max_words: 120, within_limit: false },
          factual_issues: ["placeholder content present"],
        },
      }),
    );

    const suggestion = await generateDescription({
      baseUrl: "http://api.test",
      productId: "p_1",
      prompt: "Describe it",
      fetchImpl: mockFetch,
    });

    expect(suggestion.qualityScore?.breakdown.seo).toBe(52);
    expect(suggestion.qualityScore?.breakdown.tone).toBe(0);
    expect(suggestion.qualityScore?.breakdown.length).toBe(0);
    expect(suggestion.qualityScore?.breakdown.factual).toBe(0);
    expect(suggestion.qualityScore?.notes).toEqual([
      "professional tone is too casual",
      "placeholder content present",
      "Backend quality gate did not pass",
    ]);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/products/p_1/generate-description",
      expect.objectContaining({ body: "{}" }),
    );
  });

  it("wraps backend network errors when fallback is disabled", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(
      generateDescription({
        baseUrl: "http://api.test",
        productId: "p_1",
        prompt: "Describe it",
        allowBffFallback: false,
        fetchImpl: mockFetch,
      }),
    ).rejects.toBeInstanceOf(AIContentApiError);
  });

  it("rejects invalid BFF fallback response shapes", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: "not_found" }, { status: 404 }))
      .mockResolvedValueOnce(jsonResponse({ text: "missing description" }));

    await expect(
      generateDescription({
        baseUrl: "http://api.test",
        productId: "p_1",
        prompt: "Describe it",
        allowBffFallback: true,
        fetchImpl: mockFetch,
      }),
    ).rejects.toBeInstanceOf(AIContentApiError);
  });
});

describe("getAISuggestions", () => {
  it("fetches and parses the backend AI suggestion for a product", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse(rawSuggestion));

    const suggestions = await getAISuggestions({
      baseUrl: "http://api.test",
      productId: "p_1",
      fetchImpl: mockFetch,
    });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.id).toBe("backend-p_1");
    expect(suggestions[0]?.qualityScore?.breakdown.factual).toBe(100);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/products/p_1/ai-suggestions",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("wraps malformed suggestion payloads", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ description: "missing product id" }));

    await expect(
      getAISuggestions({ baseUrl: "http://api.test", productId: "p_1", fetchImpl: mockFetch }),
    ).rejects.toBeInstanceOf(AIContentApiError);
  });

  it("accepts wrapped suggestions from early backend builds", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ suggestions: [rawSuggestion] }));

    const suggestions = await getAISuggestions({
      baseUrl: "http://api.test",
      productId: "p_1",
      fetchImpl: mockFetch,
    });

    expect(suggestions[0]?.id).toBe("backend-p_1");
  });

  it("wraps network errors", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(
      getAISuggestions({ baseUrl: "http://api.test", productId: "p_1", fetchImpl: mockFetch }),
    ).rejects.toBeInstanceOf(AIContentApiError);
  });
});
