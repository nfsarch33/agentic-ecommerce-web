// API adapter: products.
//
// This module is the only place that knows the on-the-wire shape of the
// Go backend's /api/v1/products endpoint. Domain entities are
// reconstructed via Product.fromInput so the rest of the app sees only
// validated values.
import { Product, ProductValidationError, type Currency } from "@/lib/domain/product";

export interface FetchProductsOptions {
  /**
   * Base URL of the Go backend (`mc-api`). On the server this is the
   * private fleet URL (e.g. http://mc-api:8080); on the client this is
   * the BFF route (/api/...). Tests inject a fake.
   */
  readonly baseUrl: string;
  /**
   * Optional fetch override for tests. Defaults to global fetch.
   */
  readonly fetchImpl?: typeof fetch;
  /**
   * Request signal so callers can cancel pending requests.
   */
  readonly signal?: AbortSignal;
}

export class ProductsApiError extends Error {
  override readonly name = "ProductsApiError";
  override readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.cause = cause;
  }
}

interface RawProduct {
  id?: unknown;
  title?: unknown;
  slug?: unknown;
  price?: { amount?: unknown; currency?: unknown };
  stock?: unknown;
  description?: unknown;
}

const knownCurrencies: ReadonlySet<Currency> = new Set<Currency>(["AUD", "USD", "GBP", "EUR"]);

function parseProduct(raw: RawProduct): Product {
  if (typeof raw.id !== "string") throw new ProductsApiError("product.id must be string");
  if (typeof raw.title !== "string") throw new ProductsApiError("product.title must be string");
  if (typeof raw.slug !== "string") throw new ProductsApiError("product.slug must be string");
  if (typeof raw.stock !== "number") throw new ProductsApiError("product.stock must be number");
  const price = raw.price;
  if (
    !price ||
    typeof price.amount !== "number" ||
    typeof price.currency !== "string" ||
    !knownCurrencies.has(price.currency as Currency)
  ) {
    throw new ProductsApiError("product.price must be { amount:number, currency:'AUD'|'USD'|'GBP'|'EUR' }");
  }
  try {
    return Product.fromInput({
      id: raw.id,
      title: raw.title,
      slug: raw.slug,
      price: { amount: price.amount, currency: price.currency as Currency },
      stock: raw.stock,
      description: typeof raw.description === "string" ? raw.description : undefined,
    });
  } catch (err) {
    if (err instanceof ProductValidationError) {
      throw new ProductsApiError(`product validation failed: ${err.message}`, err);
    }
    throw err;
  }
}

export interface FetchProductBySlugOptions {
  readonly baseUrl: string;
  readonly slug: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export async function fetchProductBySlug(opts: FetchProductBySlugOptions): Promise<Product> {
  if (!opts.baseUrl) {
    throw new ProductsApiError("fetchProductBySlug: baseUrl is required");
  }
  if (!opts.slug) {
    throw new ProductsApiError("fetchProductBySlug: slug is required");
  }
  const url = `${opts.baseUrl}/api/v1/products/${encodeURIComponent(opts.slug)}`;
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: opts.signal,
    });
  } catch (err) {
    throw new ProductsApiError("fetchProductBySlug: network error", err);
  }
  if (!res.ok) {
    throw new ProductsApiError(`fetchProductBySlug: HTTP ${res.status}`);
  }
  let raw: unknown;
  try {
    raw = await res.json();
  } catch (err) {
    throw new ProductsApiError("fetchProductBySlug: invalid JSON", err);
  }
  return parseProduct(raw as RawProduct);
}

export async function fetchProducts(opts: FetchProductsOptions): Promise<Product[]> {
  if (!opts.baseUrl) {
    throw new ProductsApiError("fetchProducts: baseUrl is required");
  }
  const url = `${opts.baseUrl}/api/v1/products`;
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: opts.signal,
    });
  } catch (err) {
    throw new ProductsApiError("fetchProducts: network error", err);
  }
  if (!res.ok) {
    throw new ProductsApiError(`fetchProducts: HTTP ${res.status}`);
  }
  let raw: unknown;
  try {
    raw = await res.json();
  } catch (err) {
    throw new ProductsApiError("fetchProducts: invalid JSON", err);
  }
  if (!Array.isArray(raw)) {
    throw new ProductsApiError("fetchProducts: response body must be a JSON array");
  }
  return raw.map((item) => parseProduct(item as RawProduct));
}
