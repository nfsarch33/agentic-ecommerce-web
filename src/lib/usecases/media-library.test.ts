import { describe, expect, it, vi } from "vitest";
import { loadMediaLibrary, loadProductMedia } from "./media-library";
import type { MediaAsset } from "@/lib/domain/media";

const asset = {
  id: "media_hero",
  productId: "p_1",
  sourceUrl: "https://supplier.example/hero.png",
  originalFilename: "hero.png",
  mimeType: "image/png",
  sizeBytes: 450_123,
  width: 2200,
  height: 1400,
  processingStatus: "validated",
  metadata: { altText: "Resistance band set", title: "Hero", tags: ["fitness"] },
  createdAt: "2026-05-08T00:00:00Z",
  updatedAt: "2026-05-08T01:00:00Z",
} satisfies MediaAsset;

describe("media library usecases", () => {
  it("loads the media library through the API adapter", async () => {
    const fetchMediaAssetsImpl = vi.fn().mockResolvedValue([asset]);

    const result = await loadMediaLibrary(
      { baseUrl: "https://api.example", status: "validated" },
      { fetchMediaAssetsImpl },
    );

    expect(fetchMediaAssetsImpl).toHaveBeenCalledWith({
      baseUrl: "https://api.example",
      status: "validated",
      productId: undefined,
    });
    expect(result.assets).toEqual([asset]);
  });

  it("loads media linked to a product", async () => {
    const fetchMediaAssetsImpl = vi.fn().mockResolvedValue([asset]);

    await loadProductMedia(
      { baseUrl: "https://api.example", productId: "p_1" },
      { fetchMediaAssetsImpl },
    );

    expect(fetchMediaAssetsImpl).toHaveBeenCalledWith({
      baseUrl: "https://api.example",
      productId: "p_1",
    });
  });
});
