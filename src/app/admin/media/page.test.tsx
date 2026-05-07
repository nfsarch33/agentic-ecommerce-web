import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import MediaAdminPage from "./page";

vi.mock("@/lib/usecases/media-library", () => ({
  loadMediaLibrary: vi.fn(),
}));

vi.mock("@/components/MediaLibrary", () => ({
  MediaLibrary: ({
    assets,
    apiBaseUrl,
  }: {
    assets: Array<{ id: string; metadata: { title: string } }>;
    apiBaseUrl: string;
  }) => (
    <div>
      <h1>Media Library</h1>
      <p>API: {apiBaseUrl}</p>
      {assets.map((asset) => (
        <p key={asset.id}>{asset.metadata.title}</p>
      ))}
    </div>
  ),
}));

import { loadMediaLibrary } from "@/lib/usecases/media-library";

const mockLoadMediaLibrary = vi.mocked(loadMediaLibrary);

describe("admin media page", () => {
  it("loads media assets from the backend and renders the library", async () => {
    mockLoadMediaLibrary.mockResolvedValue({
      assets: [
        {
          id: "media_hero",
          productId: "p_1",
          sourceUrl: "https://supplier.example/hero.png",
          originalFilename: "hero.png",
          mimeType: "image/png",
          sizeBytes: 450_123,
          width: 2200,
          height: 1400,
          processingStatus: "validated",
          metadata: {
            altText: "Resistance band set with five tension levels",
            title: "Resistance band hero image",
            tags: ["fitness"],
          },
          createdAt: "2026-05-08T00:00:00Z",
          updatedAt: "2026-05-08T01:00:00Z",
        },
      ],
    });

    render(await MediaAdminPage());

    expect(screen.getByRole("heading", { name: /media library/i })).toBeInTheDocument();
    expect(screen.getByText("Resistance band hero image")).toBeInTheDocument();
    expect(mockLoadMediaLibrary).toHaveBeenCalledWith(
      expect.objectContaining({ baseUrl: "http://localhost:8080" }),
    );
    expect(screen.getByText("API: http://localhost:8080")).toBeInTheDocument();
  });
});
