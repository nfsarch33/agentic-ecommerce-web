import { describe, expect, it, vi } from "vitest";
import { FactCheckApiError, getLatestFactCheckResult, searchEvidenceSources } from "./fact-check";

function jsonResponse(body: unknown, init: ResponseInit = { status: 200 }): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    ...init,
  });
}

const rawEvidence = {
  chunk_id: "ev_1",
  document_id: "doc_1",
  title: "Resistance Band Product Manual",
  source: "s3://rag-docs/resistance-band-manual.md",
  text: "The set includes five latex bands with progressive tension levels.",
  score: 0.91,
  metadata: { page: "2", source_type: "manual" },
};

const rawFactCheck = {
  id: "fc_1",
  product_id: "p_1",
  pass: false,
  confidence: 0.86,
  checked_at: "2026-05-08T01:00:00Z",
  issues: ["ambiguous claim: Warranty coverage is available."],
  claims: [
    {
      claim: { text: "The set includes five tension levels." },
      text: "The set includes five tension levels.",
      confidence: 0.92,
      status: "supported",
      evidence: [rawEvidence],
    },
    {
      claim: { text: "Warranty coverage is available." },
      text: "Warranty coverage is available.",
      confidence: 0.46,
      status: "ambiguous",
      evidence: [],
    },
  ],
};

describe("getLatestFactCheckResult", () => {
  it("fetches the latest product fact-check result and maps snake_case evidence fields", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ result: rawFactCheck }));

    const result = await getLatestFactCheckResult({
      baseUrl: "http://api.test",
      productId: "p_1",
      suggestionId: "sug_1",
      fetchImpl: mockFetch,
    });

    expect(result?.id).toBe("fc_1");
    expect(result?.overallConfidence.score).toBe(86);
    expect(result?.status).toBe("ambiguous");
    expect(result?.claims[0]?.evidence[0]?.sourceType).toBe("manual");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/products/p_1/fact-check-results/latest?suggestion_id=sug_1",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("returns undefined for an empty latest result response", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ result: null }));

    await expect(
      getLatestFactCheckResult({ baseUrl: "http://api.test", productId: "p_1", fetchImpl: mockFetch }),
    ).resolves.toBeUndefined();
  });

  it("wraps malformed fact-check payloads", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ result: { id: "broken" } }));

    await expect(
      getLatestFactCheckResult({ baseUrl: "http://api.test", productId: "p_1", fetchImpl: mockFetch }),
    ).rejects.toBeInstanceOf(FactCheckApiError);
  });
});

describe("searchEvidenceSources", () => {
  it("queries backend RAG search and parses ranked sources", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ query: "five tension levels", results: [rawEvidence] }));

    const sources = await searchEvidenceSources({
      baseUrl: "http://api.test",
      query: "five tension levels",
      productId: "p_1",
      limit: 3,
      fetchImpl: mockFetch,
    });

    expect(sources[0]?.title).toBe("Resistance Band Product Manual");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/rag/search?q=five+tension+levels&top_k=3",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ accept: "application/json" }),
      }),
    );
  });

  it("rejects empty evidence search queries before calling fetch", async () => {
    const mockFetch = vi.fn();

    await expect(
      searchEvidenceSources({ baseUrl: "http://api.test", query: "  ", fetchImpl: mockFetch }),
    ).rejects.toBeInstanceOf(FactCheckApiError);

    expect(mockFetch).not.toHaveBeenCalled();
  });
});
