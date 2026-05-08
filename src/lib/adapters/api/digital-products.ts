// HTTP adapter for the /api/v1/digital-products backend endpoints.

import type { DigitalProduct } from "@/lib/domain/digital";

export class DigitalProductsApiError extends Error {
  override readonly name = "DigitalProductsApiError";
  override readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.cause = cause;
  }
}

export interface ListDigitalProductsOptions {
  readonly baseUrl: string;
  readonly tenantId: string;
  readonly page?: number;
  readonly perPage?: number;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface FetchDigitalProductOptions {
  readonly baseUrl: string;
  readonly tenantId: string;
  readonly id: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface CreateDigitalProductOptions {
  readonly baseUrl: string;
  readonly tenantId: string;
  readonly sku: string;
  readonly name: string;
  readonly description?: string;
  readonly filePath: string;
  readonly fileSize: number;
  readonly contentType?: string;
  readonly checksum?: string;
  readonly version: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface DigitalProductsList {
  readonly products: readonly DigitalProduct[];
  readonly total: number;
  readonly page: number;
  readonly perPage: number;
}

interface RawDigitalProduct {
  readonly id?: unknown;
  readonly tenant_id?: unknown;
  readonly sku?: unknown;
  readonly name?: unknown;
  readonly description?: unknown;
  readonly file_path?: unknown;
  readonly file_size?: unknown;
  readonly content_type?: unknown;
  readonly checksum?: unknown;
  readonly version?: unknown;
  readonly created_at?: unknown;
  readonly updated_at?: unknown;
}

interface RawList {
  readonly products?: unknown;
  readonly total?: unknown;
  readonly page?: unknown;
  readonly per_page?: unknown;
}

function parseString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new DigitalProductsApiError(`${label} must be a non-empty string`);
  }
  return value;
}

function parseOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

function parseNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new DigitalProductsApiError(`${label} must be a finite number`);
  }
  return value;
}

export function parseDigitalProduct(raw: unknown): DigitalProduct {
  const value = raw as RawDigitalProduct;
  return {
    id: parseString(value?.id, "digital_product.id"),
    tenantId: parseString(value?.tenant_id, "digital_product.tenant_id"),
    sku: parseString(value?.sku, "digital_product.sku"),
    name: parseString(value?.name, "digital_product.name"),
    description: parseOptionalString(value?.description),
    filePath: parseString(value?.file_path, "digital_product.file_path"),
    fileSize: parseNumber(value?.file_size, "digital_product.file_size"),
    contentType: parseOptionalString(value?.content_type),
    checksum: parseOptionalString(value?.checksum),
    version: parseString(value?.version, "digital_product.version"),
    createdAt: parseString(value?.created_at, "digital_product.created_at"),
    updatedAt: parseString(value?.updated_at, "digital_product.updated_at"),
  };
}

function parseList(raw: unknown): DigitalProductsList {
  const value = raw as RawList;
  if (!Array.isArray(value?.products)) {
    throw new DigitalProductsApiError("response.products must be an array");
  }
  return {
    products: value.products.map(parseDigitalProduct),
    total: typeof value?.total === "number" ? value.total : 0,
    page: typeof value?.page === "number" ? value.page : 1,
    perPage: typeof value?.per_page === "number" ? value.per_page : value.products.length,
  };
}

function tenantHeaders(tenantId: string): HeadersInit {
  return { "x-tenant-id": tenantId };
}

async function readDigitalProduct(res: Response, label: string): Promise<DigitalProduct> {
  if (!res.ok) {
    throw new DigitalProductsApiError(`${label}: HTTP ${res.status}`);
  }
  try {
    return parseDigitalProduct(await res.json());
  } catch (err) {
    if (err instanceof DigitalProductsApiError) throw err;
    throw new DigitalProductsApiError(`${label}: invalid JSON`, err);
  }
}

export async function listDigitalProducts(
  opts: ListDigitalProductsOptions,
): Promise<DigitalProductsList> {
  if (!opts.baseUrl) throw new DigitalProductsApiError("listDigitalProducts: baseUrl is required");
  if (!opts.tenantId) throw new DigitalProductsApiError("listDigitalProducts: tenantId is required");
  const fetchImpl = opts.fetchImpl ?? fetch;
  const params = new URLSearchParams();
  if (opts.page) params.set("page", String(opts.page));
  if (opts.perPage) params.set("per_page", String(opts.perPage));
  const url =
    `${opts.baseUrl}/api/v1/digital-products` +
    (params.toString() ? `?${params.toString()}` : "");
  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: "GET",
      headers: tenantHeaders(opts.tenantId),
      signal: opts.signal,
    });
  } catch (err) {
    throw new DigitalProductsApiError("listDigitalProducts: network error", err);
  }
  if (!res.ok) {
    throw new DigitalProductsApiError(`listDigitalProducts: HTTP ${res.status}`);
  }
  try {
    return parseList(await res.json());
  } catch (err) {
    if (err instanceof DigitalProductsApiError) throw err;
    throw new DigitalProductsApiError("listDigitalProducts: invalid JSON", err);
  }
}

export async function fetchDigitalProduct(
  opts: FetchDigitalProductOptions,
): Promise<DigitalProduct> {
  if (!opts.baseUrl) throw new DigitalProductsApiError("fetchDigitalProduct: baseUrl is required");
  if (!opts.tenantId) throw new DigitalProductsApiError("fetchDigitalProduct: tenantId is required");
  if (!opts.id) throw new DigitalProductsApiError("fetchDigitalProduct: id is required");
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(`${opts.baseUrl}/api/v1/digital-products/${opts.id}`, {
      method: "GET",
      headers: tenantHeaders(opts.tenantId),
      signal: opts.signal,
    });
  } catch (err) {
    throw new DigitalProductsApiError("fetchDigitalProduct: network error", err);
  }
  return readDigitalProduct(res, "fetchDigitalProduct");
}

export async function createDigitalProduct(
  opts: CreateDigitalProductOptions,
): Promise<DigitalProduct> {
  if (!opts.baseUrl) throw new DigitalProductsApiError("createDigitalProduct: baseUrl is required");
  if (!opts.tenantId) throw new DigitalProductsApiError("createDigitalProduct: tenantId is required");
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(`${opts.baseUrl}/api/v1/digital-products`, {
      method: "POST",
      headers: { ...tenantHeaders(opts.tenantId), "content-type": "application/json" },
      body: JSON.stringify({
        sku: opts.sku,
        name: opts.name,
        description: opts.description,
        file_path: opts.filePath,
        file_size: opts.fileSize,
        content_type: opts.contentType,
        checksum: opts.checksum,
        version: opts.version,
      }),
      signal: opts.signal,
    });
  } catch (err) {
    throw new DigitalProductsApiError("createDigitalProduct: network error", err);
  }
  return readDigitalProduct(res, "createDigitalProduct");
}
