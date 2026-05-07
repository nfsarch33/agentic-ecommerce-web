// Use case: list products for the storefront page.
//
// The usecase composes the adapter with optional filters and returns a
// view-friendly result. Keeping logic here (and not in the React
// component) means we can unit-test the rules without rendering DOM.
import { fetchProducts } from "@/lib/adapters/api/products";
import { isInStock, type Product } from "@/lib/domain/product";

export interface ListProductsInput {
  readonly onlyInStock?: boolean;
}

export interface ListProductsResult {
  readonly products: readonly Product[];
}

export interface ListProductsDeps {
  readonly fetchProductsImpl: typeof fetchProducts | (() => Promise<readonly Product[]>);
}

export async function listProducts(
  input: ListProductsInput,
  deps: ListProductsDeps,
): Promise<ListProductsResult> {
  const all = await deps.fetchProductsImpl({
    baseUrl: process.env.MC_API_BASE_URL ?? "http://localhost:8080",
  } as never);
  const products = input.onlyInStock ? (all as readonly Product[]).filter(isInStock) : (all as readonly Product[]);
  return { products };
}
