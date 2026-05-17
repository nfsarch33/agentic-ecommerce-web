import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProductMediaPanel } from "./ProductMediaPanel";
import type { MediaAsset } from "@/lib/domain/media";

const asset: MediaAsset = {
  id: "media_hero",
  productId: "p_1",
  sourceUrl: "https://supplier.example/hero.png",
  originalFilename: "hero.png",
  mimeType: "image/png",
  sizeBytes: 450_123,
  width: 2200,
  height: 1400,
  processingStatus: "processed",
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
  reviewState: "approved",
  processState: "processed",
  reviewNote: "Approved for product content",
  reviewedAt: "2026-05-08T00:30:00Z",
  reviewer: "operator@example.com",
  qaResult: {
    status: "needs_review",
    score: 72,
    checkedAt: "2026-05-08T01:00:00Z",
    checks: [
      {
        code: "alt_text",
        status: "needs_review",
        message: "Alt text should mention the product context.",
      },
    ],
  },
  createdAt: "2026-05-08T00:00:00Z",
  updatedAt: "2026-05-08T01:00:00Z",
};

const imageEditVariant: MediaAsset = {
  ...asset,
  id: "media_variant_lifestyle",
  sourceUrl: "https://cdn.example/products/p_1/lifestyle-edit.webp",
  originalFilename: "lifestyle-edit.webp",
  processingStatus: "processed",
  metadata: {
    altText: "Generated lifestyle image with resistance bands arranged on a training mat",
    title: "Lifestyle edit variant",
    tags: ["image_edit_variant", "lifestyle"],
  },
  reviewState: "pending",
  processState: "pending",
  qaResult: {
    status: "needs_review",
    score: 81,
    checkedAt: "2026-05-12T11:10:00Z",
    checks: [
      {
        code: "approval",
        status: "needs_review",
        message: "Operator approval required before publishing.",
      },
    ],
  },
};

describe("ProductMediaPanel", () => {
  it("shows an empty state before product media is linked", () => {
    render(<ProductMediaPanel apiBaseUrl="https://api.example" productId="p_1" initialAssets={[]} />);

    expect(screen.getByText(/no product media linked yet/i)).toBeInTheDocument();
  });

  it("shows product media with QA indicators and validation action", async () => {
    const user = userEvent.setup();
    const validateMediaAssetImpl = vi.fn().mockResolvedValue({
      ...asset,
      processingStatus: "validated",
      qaResult: { ...asset.qaResult!, status: "passed", score: 94 },
    });

    render(
      <ProductMediaPanel
        apiBaseUrl="https://api.example"
        productId="p_1"
        initialAssets={[asset]}
        validateMediaAssetImpl={validateMediaAssetImpl}
      />,
    );

    expect(screen.getByRole("heading", { name: /product media/i })).toBeInTheDocument();
    expect(screen.getByText("Needs review")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /validate resistance band hero image/i }));

    expect(validateMediaAssetImpl).toHaveBeenCalledWith(
      expect.objectContaining({ baseUrl: "https://api.example", mediaId: "media_hero" }),
    );
    expect(await screen.findByText("QA passed")).toBeInTheDocument();
  });

  it("dispatches approve and reject actions to the backend media review endpoints", async () => {
    const user = userEvent.setup();
    const rejectCandidate: MediaAsset = {
      ...imageEditVariant,
      id: "media_variant_detail",
      sourceUrl: "https://cdn.example/products/p_1/detail-edit.webp",
      originalFilename: "detail-edit.webp",
      metadata: {
        altText: "Generated detail image showing the resistance band handles too close to the crop",
        title: "Detail edit variant",
        tags: ["image_edit_variant", "detail"],
      },
    };
    const approveMediaAssetImpl = vi.fn().mockResolvedValue({
      ...imageEditVariant,
      reviewState: "approved",
      reviewer: "operator@example.com",
      reviewNote: "Ready for publishing",
      reviewedAt: "2026-05-12T11:12:00Z",
    });
    const rejectMediaAssetImpl = vi.fn().mockResolvedValue({
      ...rejectCandidate,
      reviewState: "rejected",
      reviewer: "operator@example.com",
      reviewNote: "Rejected during operator review",
      reviewedAt: "2026-05-12T11:13:00Z",
    });

    render(
      <ProductMediaPanel
        apiBaseUrl="https://api.example"
        productId="p_1"
        initialAssets={[asset, imageEditVariant, rejectCandidate]}
        reviewer="operator@example.com"
        approveMediaAssetImpl={approveMediaAssetImpl}
        rejectMediaAssetImpl={rejectMediaAssetImpl}
      />,
    );

    const reviewRegion = screen.getByRole("region", { name: /image edit variants/i });
    expect(within(reviewRegion).getByText("Lifestyle edit variant")).toBeInTheDocument();
    expect(within(reviewRegion).getAllByText("Pending approval")).toHaveLength(2);

    await user.click(
      within(reviewRegion).getByRole("button", { name: /approve lifestyle edit variant/i }),
    );

    expect(approveMediaAssetImpl).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: "https://api.example",
        mediaId: "media_variant_lifestyle",
        reviewer: "operator@example.com",
        note: "Ready for publishing",
      }),
    );
    expect(await within(reviewRegion).findByText("Approved for publish")).toBeInTheDocument();

    await user.click(within(reviewRegion).getByRole("button", { name: /reject detail edit variant/i }));

    expect(rejectMediaAssetImpl).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: "https://api.example",
        mediaId: "media_variant_detail",
        reviewer: "operator@example.com",
        note: "Rejected during operator review",
      }),
    );
    expect(await within(reviewRegion).findByText("Rejected")).toBeInTheDocument();
  });

  it("sources media already linked to the product", async () => {
    const user = userEvent.setup();
    const sourceMediaImpl = vi.fn().mockResolvedValue({
      ...asset,
      id: "media_new",
      metadata: { altText: "New product lifestyle image", title: "Lifestyle image", tags: [] },
    });

    render(
      <ProductMediaPanel
        apiBaseUrl="https://api.example"
        productId="p_1"
        initialAssets={[]}
        sourceMediaImpl={sourceMediaImpl}
      />,
    );

    fireEvent.change(screen.getByLabelText(/source url/i), {
      target: { value: "https://supplier.example/lifestyle.png" },
    });
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Lifestyle image" } });
    fireEvent.change(screen.getByLabelText(/alt text/i), {
      target: { value: "New product lifestyle image" },
    });
    await user.click(screen.getByRole("button", { name: /add product media/i }));

    expect(sourceMediaImpl).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: "p_1",
        sourceUrl: "https://supplier.example/lifestyle.png",
      }),
    );
    expect(await screen.findByText("Lifestyle image")).toBeInTheDocument();
  });

  it("reports source validation and backend errors", async () => {
    const user = userEvent.setup();
    const sourceMediaImpl = vi.fn().mockRejectedValue(new Error("source failed"));

    render(
      <ProductMediaPanel
        apiBaseUrl="https://api.example"
        productId="p_1"
        initialAssets={[]}
        sourceMediaImpl={sourceMediaImpl}
      />,
    );

    await user.click(screen.getByRole("button", { name: /add product media/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/add a source url/i);

    fireEvent.change(screen.getByLabelText(/source url/i), {
      target: { value: "https://supplier.example/failing.png" },
    });
    await user.click(screen.getByRole("button", { name: /add product media/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/source failed/i);
  });

  it("reports validation errors from the backend", async () => {
    const user = userEvent.setup();
    const validateMediaAssetImpl = vi.fn().mockRejectedValue(new Error("validation failed"));

    render(
      <ProductMediaPanel
        apiBaseUrl="https://api.example"
        productId="p_1"
        initialAssets={[asset]}
        validateMediaAssetImpl={validateMediaAssetImpl}
      />,
    );

    await user.click(screen.getByRole("button", { name: /validate resistance band hero image/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/validation failed/i);
  });

  it("shows operator review failures and leaves the retry affordance available", async () => {
    const user = userEvent.setup();
    const approveMediaAssetImpl = vi.fn().mockRejectedValue(new Error("approval failed"));

    render(
      <ProductMediaPanel
        apiBaseUrl="https://api.example"
        productId="p_1"
        initialAssets={[imageEditVariant]}
        reviewer="operator@example.com"
        approveMediaAssetImpl={approveMediaAssetImpl}
      />,
    );

    const approveButton = screen.getByRole("button", { name: /approve lifestyle edit variant/i });
    await user.click(approveButton);

    expect(await screen.findByRole("alert")).toHaveTextContent(/approval failed/i);
    expect(approveButton).toBeEnabled();
  });
});
