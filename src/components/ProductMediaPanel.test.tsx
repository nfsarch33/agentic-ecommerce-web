import { fireEvent, render, screen } from "@testing-library/react";
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
});
