import { describe, expect, it, vi } from "vitest";
import {
  fetchMediaAsset,
  fetchMediaAssets,
  processMediaAsset,
  sourceMedia,
  updateMediaMetadata,
  validateMediaAsset,
} from "./media";

const rawAsset = {
  id: "media_hero",
  product_id: "p_1",
  source_url: "https://supplier.example/hero.png",
  alt_text: "Resistance band set with five tension levels",
  metadata: {
    mime_type: "image/png",
    content_length: 450_123,
    checksum_sha256: "a".repeat(64),
    width: 2200,
    height: 1400,
  },
  quality: {
    pass: true,
    score: 92,
    issues: [],
  },
  storage: {
    key: "products/p_1/hero.webp",
    url: "https://cdn.example/products/p_1/hero.webp",
    content_type: "image/png",
    size_bytes: 450_123,
  },
  created_at: "2026-05-08T00:00:00Z",
};

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { "content-type": "application/json", ...init.headers },
  });
}

describe("media API adapter", () => {
  it("fetches media assets with status and product filters", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ assets: [rawAsset] }));

    const assets = await fetchMediaAssets({
      baseUrl: "https://api.example",
      productId: "p_1",
      status: "validated",
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example/api/v1/media?product_id=p_1&status=validated",
      expect.objectContaining({ method: "GET" }),
    );
    expect(assets[0]?.metadata.altText).toBe("Resistance band set with five tension levels");
  });

  it("fetches the whole media library without optional filters", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ assets: [rawAsset] }));

    await fetchMediaAssets({
      baseUrl: "https://api.example",
      status: "all",
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example/api/v1/media",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("sources remote media with metadata", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(rawAsset, { status: 201 }));

    const asset = await sourceMedia({
      baseUrl: "https://api.example",
      sourceUrl: "https://supplier.example/hero.png",
      productId: "p_1",
      metadata: {
        altText: "Resistance band set with five tension levels",
        title: "Hero",
        tags: ["fitness"],
      },
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example/api/v1/media/source",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          url: "https://supplier.example/hero.png",
          product_id: "p_1",
          alt_text: "Resistance band set with five tension levels",
        }),
      }),
    );
    expect(asset.id).toBe("media_hero");
  });

  it("rejects file-only sourcing because the backend media source API requires a URL", async () => {
    const fetchImpl = vi.fn();

    await expect(
      sourceMedia({
        baseUrl: "https://api.example",
        file: {
          name: "hero.png",
          type: "image/png",
          size: 450_123,
          width: 2200,
          height: 1400,
        },
        metadata: { altText: "Resistance band set", title: "Hero", tags: [] },
        fetchImpl,
      }),
    ).rejects.toThrow(/sourceUrl is required/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("processes, validates, fetches, and updates media assets", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(rawAsset))
      .mockResolvedValueOnce(jsonResponse({ pass: true, score: 94, issues: [] }))
      .mockResolvedValueOnce(jsonResponse(rawAsset))
      .mockResolvedValueOnce(jsonResponse(rawAsset))
      .mockResolvedValueOnce(jsonResponse({ asset: rawAsset }));

    await processMediaAsset({ baseUrl: "https://api.example", mediaId: "media_hero", fetchImpl });
    await validateMediaAsset({ baseUrl: "https://api.example", mediaId: "media_hero", fetchImpl });
    await fetchMediaAsset({ baseUrl: "https://api.example", mediaId: "media_hero", fetchImpl });
    await updateMediaMetadata({
      baseUrl: "https://api.example",
      mediaId: "media_hero",
      metadata: { altText: "Updated accessible alt text", title: "Updated", tags: ["hero"] },
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "https://api.example/api/v1/media/process",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ media_id: "media_hero" }) }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "https://api.example/api/v1/media/media_hero/validate",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      3,
      "https://api.example/api/v1/media/media_hero",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      4,
      "https://api.example/api/v1/media/media_hero",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      5,
      "https://api.example/api/v1/media/media_hero/metadata",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("raises useful errors for backend failures", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ error: "bad" }, { status: 500 }));

    await expect(
      fetchMediaAsset({ baseUrl: "https://api.example", mediaId: "media_hero", fetchImpl }),
    ).rejects.toThrow(/HTTP 500/);
  });

  it("raises useful errors for invalid requests and malformed responses", async () => {
    await expect(
      sourceMedia({
        baseUrl: "https://api.example",
        metadata: { altText: "", title: "Untitled", tags: [] },
        fetchImpl: vi.fn(),
      }),
    ).rejects.toThrow(/sourceUrl is required/);

    await expect(
      fetchMediaAssets({
        baseUrl: "https://api.example",
        fetchImpl: vi.fn().mockResolvedValue(jsonResponse({ assets: null })),
      }),
    ).rejects.toThrow(/assets array/);

    await expect(
      fetchMediaAsset({
        baseUrl: "https://api.example",
        mediaId: "media_hero",
        fetchImpl: vi.fn().mockResolvedValue(new Response("not json")),
      }),
    ).rejects.toThrow(/invalid JSON/);
  });
});
