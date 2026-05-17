import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MediaLibrary } from "./MediaLibrary";
import type { MediaAsset } from "@/lib/domain/media";

const assets: MediaAsset[] = [
  {
    id: "media_passed",
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
    reviewState: "approved",
    processState: "processed",
    reviewNote: "Approved for hero placement",
    reviewedAt: "2026-05-08T00:30:00Z",
    reviewer: "operator@example.com",
    qaResult: {
      status: "passed",
      score: 92,
      checkedAt: "2026-05-08T01:00:00Z",
      checks: [
        { code: "resolution", status: "passed", message: "Image exceeds minimum resolution." },
      ],
    },
    createdAt: "2026-05-08T00:00:00Z",
    updatedAt: "2026-05-08T01:00:00Z",
  },
  {
    id: "media_failed",
    productId: "p_2",
    sourceUrl: "https://supplier.example/thumb.jpg",
    originalFilename: "thumb.jpg",
    mimeType: "image/jpeg",
    sizeBytes: 12_000,
    width: 320,
    height: 240,
    processingStatus: "failed",
    metadata: {
      altText: "",
      title: "Tiny supplier thumbnail",
      tags: ["supplier"],
    },
    reviewState: "rejected",
    processState: "pending",
    reviewNote: "Supplier thumbnail is too small",
    reviewedAt: "2026-05-08T00:45:00Z",
    reviewer: "qa@example.com",
    qaResult: {
      status: "failed",
      score: 24,
      checkedAt: "2026-05-08T01:00:00Z",
      checks: [{ code: "resolution", status: "failed", message: "Image is below 1200px wide." }],
    },
    createdAt: "2026-05-08T00:00:00Z",
    updatedAt: "2026-05-08T01:00:00Z",
  },
];

describe("MediaLibrary", () => {
  it("shows an empty state when no assets match the current filter", async () => {
    const user = userEvent.setup();
    render(<MediaLibrary assets={assets} />);

    await user.selectOptions(screen.getByLabelText(/processing status/i), "processing");

    expect(screen.getByText(/no media assets found/i)).toBeInTheDocument();
  });

  it("renders media cards with processing and QA status badges", () => {
    render(<MediaLibrary assets={assets} />);

    expect(screen.getByRole("heading", { name: /media library/i })).toBeInTheDocument();
    expect(screen.getByText("Resistance band hero image")).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: /media assets/i })).getByText("Validated"),
    ).toBeInTheDocument();
    expect(screen.getByText("QA passed")).toBeInTheDocument();
    expect(screen.getByText("Image is below 1200px wide.")).toBeInTheDocument();
  });

  it("filters the grid by processing status", async () => {
    const user = userEvent.setup();
    render(<MediaLibrary assets={assets} />);

    await user.selectOptions(screen.getByLabelText(/processing status/i), "failed");

    expect(screen.queryByText("Resistance band hero image")).not.toBeInTheDocument();
    expect(screen.getByText("Tiny supplier thumbnail")).toBeInTheDocument();
  });

  it("sources media and adds the returned preview to the grid", async () => {
    const user = userEvent.setup();
    const sourceMediaImpl = vi.fn().mockResolvedValue({
      ...assets[0]!,
      id: "media_new",
      metadata: { altText: "New accessible alt text", title: "New hero image", tags: ["new"] },
    });

    render(<MediaLibrary assets={[]} sourceMediaImpl={sourceMediaImpl} />);

    fireEvent.change(screen.getByLabelText(/source url/i), {
      target: { value: "https://supplier.example/new.png" },
    });
    fireEvent.change(screen.getByLabelText(/^title/i), { target: { value: "New hero image" } });
    fireEvent.change(screen.getByLabelText(/alt text/i), {
      target: { value: "New accessible alt text" },
    });
    fireEvent.change(screen.getByLabelText(/tags/i), { target: { value: "new" } });
    await user.click(screen.getByRole("button", { name: /source media/i }));

    expect(sourceMediaImpl).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceUrl: "https://supplier.example/new.png",
        metadata: expect.objectContaining({ title: "New hero image" }),
      }),
    );
    expect(await screen.findByText("New hero image")).toBeInTheDocument();
  });

  it("shows a loading state while source media is pending", async () => {
    const user = userEvent.setup();
    let resolveSource: (asset: MediaAsset) => void = () => {};
    const sourceMediaImpl = vi.fn(
      () =>
        new Promise<MediaAsset>((resolve) => {
          resolveSource = resolve;
        }),
    );

    render(<MediaLibrary assets={[]} sourceMediaImpl={sourceMediaImpl} />);
    fireEvent.change(screen.getByLabelText(/source url/i), {
      target: { value: "https://supplier.example/new.png" },
    });
    await user.click(screen.getByRole("button", { name: /source media/i }));

    expect(screen.getByRole("button", { name: /sourcing/i })).toHaveAttribute("aria-busy", "true");
    resolveSource({
      ...assets[0]!,
      id: "media_loading",
      metadata: { altText: "Loading alt text", title: "Loaded image", tags: [] },
    });
    expect(await screen.findByText("Loaded image")).toBeInTheDocument();
  });

  it("accepts file metadata when upload transport is stubbed", async () => {
    const user = userEvent.setup();
    const file = new File(["image"], "upload.png", { type: "image/png" });
    const sourceMediaImpl = vi.fn().mockResolvedValue({
      ...assets[0]!,
      id: "media_upload",
      metadata: { altText: "", title: "upload.png", tags: [] },
    });

    render(<MediaLibrary assets={[]} sourceMediaImpl={sourceMediaImpl} />);

    await user.upload(screen.getByLabelText(/file metadata/i), file);
    expect(screen.getByText("upload.png")).toBeInTheDocument();
    expect(screen.getByText("image/png")).toBeInTheDocument();
    expect(screen.getByText("5 bytes")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/source url/i), {
      target: { value: "https://supplier.example/upload.png" },
    });
    await user.click(screen.getByRole("button", { name: /source media/i }));

    expect(sourceMediaImpl).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceUrl: "https://supplier.example/upload.png",
        file: expect.objectContaining({ name: "upload.png", type: "image/png" }),
        metadata: expect.objectContaining({ title: "upload.png" }),
      }),
    );
  });

  it("renders review and process lifecycle badges from the backend asset contract", () => {
    render(<MediaLibrary assets={assets} />);

    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("Rejected")).toBeInTheDocument();
    expect(screen.getByText("Complete")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("shows source and metadata editor errors", async () => {
    const user = userEvent.setup();
    const updateMediaMetadataImpl = vi.fn().mockRejectedValue(new Error("metadata failed"));

    render(<MediaLibrary assets={assets} updateMediaMetadataImpl={updateMediaMetadataImpl} />);

    await user.click(screen.getByRole("button", { name: /source media/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/add a source url/i);

    await user.click(screen.getByRole("button", { name: /edit resistance band hero image/i }));
    await user.click(screen.getByRole("button", { name: /save metadata/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/metadata failed/i);
  });

  it("edits metadata for the selected asset", async () => {
    const user = userEvent.setup();
    const updateMediaMetadataImpl = vi.fn().mockResolvedValue({
      ...assets[0]!,
      metadata: {
        altText: "Updated alt text for resistance bands",
        title: "Updated hero",
        tags: ["updated"],
      },
    });

    render(<MediaLibrary assets={assets} updateMediaMetadataImpl={updateMediaMetadataImpl} />);

    await user.click(screen.getByRole("button", { name: /edit resistance band hero image/i }));
    const editor = screen.getByRole("region", { name: /metadata editor/i });
    fireEvent.change(within(editor).getByLabelText(/^title/i), {
      target: { value: "Updated hero" },
    });
    fireEvent.change(within(editor).getByLabelText(/alt text/i), {
      target: { value: "Updated alt text for resistance bands" },
    });
    fireEvent.change(within(editor).getByLabelText(/tags/i), { target: { value: "updated" } });
    await user.click(within(editor).getByRole("button", { name: /save metadata/i }));

    expect(updateMediaMetadataImpl).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaId: "media_passed",
        metadata: {
          altText: "Updated alt text for resistance bands",
          title: "Updated hero",
          tags: ["updated"],
        },
      }),
    );
    expect(await screen.findByText("Updated hero")).toBeInTheDocument();
  });
});
