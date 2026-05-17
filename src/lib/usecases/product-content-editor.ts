import { AIContentApiError, generateDescription, getAISuggestions } from "@/lib/adapters/api/ai-content";
import { fetchProductBySlug } from "@/lib/adapters/api/products";
import { selectLatestSuggestion, type AIProductDescriptionSuggestion } from "@/lib/domain/ai-description";
import type { Product, ProductFields } from "@/lib/domain/product";

export interface LoadProductContentEditorInput {
  readonly baseUrl: string;
  readonly productId: string;
}

export interface LoadProductContentEditorResult {
  readonly product: Product;
  readonly suggestions: readonly AIProductDescriptionSuggestion[];
  readonly activeSuggestion?: AIProductDescriptionSuggestion;
  readonly suggestionsError?: string;
}

export interface LoadProductContentEditorDeps {
  readonly fetchProductImpl?: (opts: { readonly baseUrl: string; readonly slug: string }) => Promise<Product>;
  readonly getSuggestionsImpl?: (opts: {
    readonly baseUrl: string;
    readonly productId: string;
  }) => Promise<readonly AIProductDescriptionSuggestion[]>;
}

export interface GenerateDescriptionForProductInput {
  readonly baseUrl: string;
  readonly product: ProductFields;
  readonly prompt?: string;
  readonly allowBffFallback?: boolean;
  readonly fallbackBffBaseUrl?: string;
}

export interface GenerateDescriptionForProductDeps {
  readonly generateDescriptionImpl?: typeof generateDescription;
}

export function defaultDescriptionPrompt(product: ProductFields): string {
  const currentDescription = product.description?.trim()
    ? `Current description: ${product.description.trim()}`
    : "Current description: none";
  return [
    `Write an ecommerce product description for ${product.title}.`,
    `SKU: ${product.sku}.`,
    currentDescription,
    "Return concise, factual, SEO-aware copy with a confident but not exaggerated tone.",
  ].join(" ");
}

export async function loadProductContentEditor(
  input: LoadProductContentEditorInput,
  deps: LoadProductContentEditorDeps = {},
): Promise<LoadProductContentEditorResult> {
  const fetchProductImpl = deps.fetchProductImpl ?? fetchProductBySlug;
  const getSuggestionsImpl = deps.getSuggestionsImpl ?? getAISuggestions;
  const [product, suggestionState] = await Promise.all([
    fetchProductImpl({ baseUrl: input.baseUrl, slug: input.productId }),
    getSuggestionsImpl({ baseUrl: input.baseUrl, productId: input.productId })
      .then((suggestions) => ({ suggestions }))
      .catch((err) => {
        if (err instanceof AIContentApiError && err.status === 504) {
          return {
            suggestions: [] as readonly AIProductDescriptionSuggestion[],
            suggestionsError: err.message,
          };
        }
        throw err;
      }),
  ]);
  const suggestions = suggestionState.suggestions;
  const suggestionsError = "suggestionsError" in suggestionState ? suggestionState.suggestionsError : undefined;
  return {
    product,
    suggestions,
    activeSuggestion: selectLatestSuggestion(suggestions),
    suggestionsError,
  };
}

export async function generateDescriptionForProduct(
  input: GenerateDescriptionForProductInput,
  deps: GenerateDescriptionForProductDeps = {},
): Promise<AIProductDescriptionSuggestion> {
  const generateDescriptionImpl = deps.generateDescriptionImpl ?? generateDescription;
  const prompt = input.prompt?.trim() || defaultDescriptionPrompt(input.product);
  return generateDescriptionImpl({
    baseUrl: input.baseUrl,
    productId: input.product.id,
    prompt,
    allowBffFallback: input.allowBffFallback,
    fallbackBffBaseUrl: input.fallbackBffBaseUrl,
  });
}
