import { describe, expect, it, vi } from "vitest";
import { Product } from "@/lib/domain/product";
import { createAISuggestion } from "@/lib/domain/ai-description";
import {
  defaultDescriptionPrompt,
  generateDescriptionForProduct,
  loadProductContentEditor,
} from "./product-content-editor";

const product = Product.fromInput({
  id: "p_1",
  sku: "BAND-001",
  title: "Resistance Band Set",
  slug: "resistance-band-set",
  price: { amount: 2495, currency: "AUD" },
  stock: 12,
  description: "Progressive resistance band set with 5 tension levels.",
});

const qualityScore = {
  readability: 82,
  seo: 78,
  tone: 90,
  length: 80,
  factual: 88,
};

const suggestion = createAISuggestion({
  id: "sug_1",
  productId: product.id,
  description: "A polished AI-generated product description.",
  status: "generated",
  qualityScore,
  createdAt: "2026-05-07T04:00:00Z",
});

describe("loadProductContentEditor", () => {
  it("loads the product and AI suggestions together", async () => {
    const fetchProductImpl = vi.fn().mockResolvedValue(product);
    const getSuggestionsImpl = vi.fn().mockResolvedValue([suggestion]);

    const result = await loadProductContentEditor(
      { baseUrl: "http://api.test", productId: product.id },
      { fetchProductImpl, getSuggestionsImpl },
    );

    expect(result.product.id).toBe(product.id);
    expect(result.suggestions).toHaveLength(1);
    expect(result.activeSuggestion?.id).toBe("sug_1");
    expect(fetchProductImpl).toHaveBeenCalledWith(
      expect.objectContaining({ baseUrl: "http://api.test", slug: product.id }),
    );
    expect(getSuggestionsImpl).toHaveBeenCalledWith(
      expect.objectContaining({ baseUrl: "http://api.test", productId: product.id }),
    );
  });
});

describe("generateDescriptionForProduct", () => {
  it("uses a product-aware default prompt when none is supplied", async () => {
    const generateDescriptionImpl = vi.fn().mockResolvedValue(suggestion);

    await generateDescriptionForProduct(
      { baseUrl: "http://api.test", product },
      { generateDescriptionImpl },
    );

    expect(generateDescriptionImpl).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: "http://api.test",
        productId: product.id,
        prompt: defaultDescriptionPrompt(product),
      }),
    );
    expect(defaultDescriptionPrompt(product)).toContain("Resistance Band Set");
    expect(defaultDescriptionPrompt(product)).toContain("BAND-001");
  });

  it("preserves an explicit prompt and fallback options", async () => {
    const generateDescriptionImpl = vi.fn().mockResolvedValue(suggestion);

    await generateDescriptionForProduct(
      {
        baseUrl: "http://api.test",
        product,
        prompt: "  Custom operator prompt  ",
        allowBffFallback: true,
        fallbackBffBaseUrl: "",
      },
      { generateDescriptionImpl },
    );

    expect(generateDescriptionImpl).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "Custom operator prompt",
        allowBffFallback: true,
        fallbackBffBaseUrl: "",
      }),
    );
  });

  it("builds a default prompt for products without a current description", () => {
    const noDescription = Product.fromInput({
      ...product,
      description: undefined,
    });

    expect(defaultDescriptionPrompt(noDescription)).toContain("Current description: none");
  });
});
