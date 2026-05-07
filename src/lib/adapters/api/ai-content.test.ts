import { describe, expect, it, vi } from "vitest";
import { AIContentApiError, generateDescription, getAISuggestions } from "./ai-content";

function jsonResponse(body: unknown, init: ResponseInit = { status: 200 }): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    ...init,
  });
}

const rawSuggestion = {
  id: "sug_1",
  product_id: "p_1",
  description: "A durable resistance band set for progressive strength training.",
  status: "generated",
  quality_score: {
    overall: 84,
    readability: 82,
    seo: 78,
    tone: 90,
    length: 80,
    factual: 88,
    notes: ["Clear benefit-led opening"],
  },
  created_at: "2026-05-07T04:00:00Z",
  model: "minimax-text-01",
};

describe("generateDescription", () => {
  it("posts to the backend content-agent endpoint and parses a suggestion", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ suggestion: rawSuggestion }));

    const suggestion = await generateDescription({
      baseUrl: "http://api.test",
      productId: "p_1",
      prompt: "Rewrite for SEO",
      fetchImpl: mockFetch,
    });

    expect(suggestion.description).toContain("resistance band");
    expect(suggestion.qualityScore?.overall).toBe(84);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/products/p_1/generate-description",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "content-type": "application/json" }),
        body: JSON.stringify({ prompt: "Rewrite for SEO" }),
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

  it("parses unwrapped camelCase backend suggestions without quality scores", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      jsonResponse({
        id: "sug_camel",
        productId: "p_1",
        description: "Camel case response",
        status: "generated",
        createdAt: "2026-05-07T04:00:00Z",
      }),
    );

    const suggestion = await generateDescription({
      baseUrl: "http://api.test",
      productId: "p_1",
      prompt: "Describe it",
      fetchImpl: mockFetch,
    });

    expect(suggestion.id).toBe("sug_camel");
    expect(suggestion.qualityScore).toBeUndefined();
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
  it("fetches and parses existing AI suggestions for a product", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ suggestions: [rawSuggestion] }));

    const suggestions = await getAISuggestions({
      baseUrl: "http://api.test",
      productId: "p_1",
      fetchImpl: mockFetch,
    });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.id).toBe("sug_1");
    expect(suggestions[0]?.qualityScore?.breakdown.factual).toBe(88);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/products/p_1/ai-suggestions",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("wraps malformed suggestion payloads", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ suggestions: [{ id: "broken" }] }));

    await expect(
      getAISuggestions({ baseUrl: "http://api.test", productId: "p_1", fetchImpl: mockFetch }),
    ).rejects.toBeInstanceOf(AIContentApiError);
  });

  it("accepts a bare suggestions array from early backend builds", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse([rawSuggestion]));

    const suggestions = await getAISuggestions({
      baseUrl: "http://api.test",
      productId: "p_1",
      fetchImpl: mockFetch,
    });

    expect(suggestions[0]?.id).toBe("sug_1");
  });

  it("wraps network errors", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(
      getAISuggestions({ baseUrl: "http://api.test", productId: "p_1", fetchImpl: mockFetch }),
    ).rejects.toBeInstanceOf(AIContentApiError);
  });
});
