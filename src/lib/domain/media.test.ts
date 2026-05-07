import { describe, expect, it } from "vitest";
import {
  createMediaAsset,
  mediaQAStatusLabel,
  mediaQAStatusTone,
  mediaStatusLabel,
  type MediaAssetInput,
} from "./media";

const baseAsset: MediaAssetInput = {
  id: "media_hero",
  productId: "p_1",
  sourceUrl: "https://supplier.example/hero.png",
  originalFilename: "hero.png",
  mimeType: "image/png",
  sizeBytes: 450_123,
  width: 2200,
  height: 1400,
  processingStatus: "validated",
  objectStoreLocation: {
    provider: "local",
    bucket: "media",
    key: "products/p_1/hero.webp",
    url: "https://cdn.example/products/p_1/hero.webp",
  },
  metadata: {
    altText: "Resistance band set with five tension levels",
    title: "Resistance band hero image",
    tags: ["fitness", "hero"],
  },
  qaResult: {
    status: "passed",
    score: 92,
    checkedAt: "2026-05-08T01:00:00Z",
    checks: [
      {
        code: "resolution",
        status: "passed",
        message: "Image exceeds minimum resolution.",
      },
    ],
  },
  createdAt: "2026-05-08T00:00:00Z",
  updatedAt: "2026-05-08T01:00:00Z",
};

describe("MediaAsset", () => {
  it("normalizes metadata tags and preserves object store location", () => {
    const asset = createMediaAsset({
      ...baseAsset,
      metadata: {
        altText: "  Resistance band set with five tension levels  ",
        title: "  Resistance band hero image  ",
        tags: ["fitness", "hero", "fitness", "  "],
      },
    });

    expect(asset.metadata.altText).toBe("Resistance band set with five tension levels");
    expect(asset.metadata.title).toBe("Resistance band hero image");
    expect(asset.metadata.tags).toEqual(["fitness", "hero"]);
    expect(asset.objectStoreLocation?.key).toBe("products/p_1/hero.webp");
  });

  it("rejects invalid processing and QA statuses", () => {
    expect(() =>
      createMediaAsset({
        ...baseAsset,
        processingStatus: "unknown",
      } as unknown as MediaAssetInput),
    ).toThrow(/processingStatus/);

    expect(() =>
      createMediaAsset({
        ...baseAsset,
        qaResult: {
          ...baseAsset.qaResult!,
          status: "unknown",
        },
      } as unknown as MediaAssetInput),
    ).toThrow(/qaResult.status/);
  });

  it("labels processing and QA states for status badges", () => {
    expect(mediaStatusLabel("sourced")).toBe("Sourced");
    expect(mediaStatusLabel("processing")).toBe("Processing");
    expect(mediaStatusLabel("processed")).toBe("Processed");
    expect(mediaStatusLabel("validated")).toBe("Validated");
    expect(mediaStatusLabel("failed")).toBe("Failed");
    expect(mediaQAStatusLabel("pending")).toBe("QA pending");
    expect(mediaQAStatusLabel("passed")).toBe("QA passed");
    expect(mediaQAStatusLabel("needs_review")).toBe("Needs review");
    expect(mediaQAStatusLabel("failed")).toBe("QA failed");
    expect(mediaQAStatusTone("failed")).toBe("red");
    expect(mediaQAStatusTone("needs_review")).toBe("amber");
    expect(mediaQAStatusTone("pending")).toBe("gray");
    expect(mediaQAStatusTone("passed")).toBe("green");
  });
});
