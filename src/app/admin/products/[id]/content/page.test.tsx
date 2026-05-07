import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ProductContentPage from "./page";

vi.mock("@/lib/usecases/product-content-editor", () => ({
  loadProductContentEditor: vi.fn(),
}));

vi.mock("@/components/AIProductDescriptionPanel", () => ({
  AIProductDescriptionPanel: ({
    product,
    initialSuggestions,
  }: {
    product: { title: string };
    initialSuggestions: unknown[];
  }) => (
    <div>
      <h1>AI Description Studio</h1>
      <p>Product: {product.title}</p>
      <p>Suggestions: {initialSuggestions.length}</p>
    </div>
  ),
}));

import { loadProductContentEditor } from "@/lib/usecases/product-content-editor";

const mockLoadProductContentEditor = vi.mocked(loadProductContentEditor);

describe("Product content admin page", () => {
  it("loads product content state and renders the AI description panel", async () => {
    mockLoadProductContentEditor.mockResolvedValue({
      product: {
        id: "p_1",
        sku: "BAND-001",
        title: "Resistance Band Set",
        slug: "resistance-band-set",
        price: { amount: 2495, currency: "AUD" },
        stock: 12,
        description: "Current copy",
      } as never,
      suggestions: [
        {
          id: "sug_1",
          productId: "p_1",
          description: "Generated copy",
          status: "generated",
        },
      ] as never,
      activeSuggestion: undefined,
    });

    render(await ProductContentPage({ params: Promise.resolve({ id: "p_1" }) }));

    expect(screen.getByRole("heading", { name: /ai description studio/i })).toBeInTheDocument();
    expect(screen.getByText("Product: Resistance Band Set")).toBeInTheDocument();
    expect(screen.getByText("Suggestions: 1")).toBeInTheDocument();
    expect(mockLoadProductContentEditor).toHaveBeenCalledWith(
      expect.objectContaining({ baseUrl: "http://localhost:8080", productId: "p_1" }),
    );
  });
});
