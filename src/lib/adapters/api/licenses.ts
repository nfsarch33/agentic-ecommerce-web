// HTTP adapter for the /api/v1/licenses, /api/v1/me/licenses backend
// endpoints.

import type { DigitalDownload, License } from "@/lib/domain/digital";
import { isLicenseState } from "@/lib/domain/digital";

export class LicensesApiError extends Error {
  override readonly name = "LicensesApiError";
  override readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.cause = cause;
  }
}

export interface ListLicensesOptions {
  readonly baseUrl: string;
  readonly tenantId: string;
  readonly page?: number;
  readonly perPage?: number;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface FetchLicenseOptions {
  readonly baseUrl: string;
  readonly tenantId: string;
  readonly id: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface IssueLicenseOptions {
  readonly baseUrl: string;
  readonly tenantId: string;
  readonly productId: string;
  readonly customerId: string;
  readonly source?: "purchase" | "gift" | "admin";
  readonly maxActivations?: number;
  readonly expiresAt?: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface RevokeLicenseOptions {
  readonly baseUrl: string;
  readonly tenantId: string;
  readonly id: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface CustomerDownloadOptions {
  readonly baseUrl: string;
  readonly tenantId: string;
  readonly licenseId: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface LicensesList {
  readonly licenses: readonly License[];
  readonly total: number;
  readonly page: number;
  readonly perPage: number;
}

interface RawLicense {
  readonly id?: unknown;
  readonly tenant_id?: unknown;
  readonly product_id?: unknown;
  readonly customer_id?: unknown;
  readonly key?: unknown;
  readonly state?: unknown;
  readonly issued_at?: unknown;
  readonly expires_at?: unknown;
  readonly max_activations?: unknown;
  readonly updated_at?: unknown;
}

interface RawList {
  readonly licenses?: unknown;
  readonly total?: unknown;
  readonly page?: unknown;
  readonly per_page?: unknown;
}

function parseString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new LicensesApiError(`${label} must be a non-empty string`);
  }
  return value;
}

function parseOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

function parseNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new LicensesApiError(`${label} must be a finite number`);
  }
  return value;
}

export function parseLicense(raw: unknown): License {
  const value = raw as RawLicense;
  const state = value?.state;
  if (typeof state !== "string" || !isLicenseState(state)) {
    throw new LicensesApiError(`license.state is invalid: ${JSON.stringify(state)}`);
  }
  return {
    id: parseString(value?.id, "license.id"),
    tenantId: parseString(value?.tenant_id, "license.tenant_id"),
    productId: parseString(value?.product_id, "license.product_id"),
    customerId: parseString(value?.customer_id, "license.customer_id"),
    key: parseString(value?.key, "license.key"),
    state,
    issuedAt: parseString(value?.issued_at, "license.issued_at"),
    expiresAt: parseOptionalString(value?.expires_at),
    maxActivations: parseNumber(value?.max_activations, "license.max_activations"),
    updatedAt: parseString(value?.updated_at, "license.updated_at"),
  };
}

function parseList(raw: unknown): LicensesList {
  const value = raw as RawList;
  if (!Array.isArray(value?.licenses)) {
    throw new LicensesApiError("response.licenses must be an array");
  }
  return {
    licenses: value.licenses.map(parseLicense),
    total: typeof value?.total === "number" ? value.total : 0,
    page: typeof value?.page === "number" ? value.page : 1,
    perPage: typeof value?.per_page === "number" ? value.per_page : value.licenses.length,
  };
}

function tenantHeaders(tenantId: string): HeadersInit {
  return { "x-tenant-id": tenantId };
}

async function readLicense(res: Response, label: string): Promise<License> {
  if (!res.ok) {
    throw new LicensesApiError(`${label}: HTTP ${res.status}`);
  }
  try {
    return parseLicense(await res.json());
  } catch (err) {
    if (err instanceof LicensesApiError) throw err;
    throw new LicensesApiError(`${label}: invalid JSON`, err);
  }
}

export async function listLicenses(opts: ListLicensesOptions): Promise<LicensesList> {
  if (!opts.baseUrl) throw new LicensesApiError("listLicenses: baseUrl is required");
  if (!opts.tenantId) throw new LicensesApiError("listLicenses: tenantId is required");
  const fetchImpl = opts.fetchImpl ?? fetch;
  const params = new URLSearchParams();
  if (opts.page) params.set("page", String(opts.page));
  if (opts.perPage) params.set("per_page", String(opts.perPage));
  const url =
    `${opts.baseUrl}/api/v1/licenses` + (params.toString() ? `?${params.toString()}` : "");
  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: "GET",
      headers: tenantHeaders(opts.tenantId),
      signal: opts.signal,
    });
  } catch (err) {
    throw new LicensesApiError("listLicenses: network error", err);
  }
  if (!res.ok) {
    throw new LicensesApiError(`listLicenses: HTTP ${res.status}`);
  }
  try {
    return parseList(await res.json());
  } catch (err) {
    if (err instanceof LicensesApiError) throw err;
    throw new LicensesApiError("listLicenses: invalid JSON", err);
  }
}

export async function listMyLicenses(opts: ListLicensesOptions): Promise<LicensesList> {
  if (!opts.baseUrl) throw new LicensesApiError("listMyLicenses: baseUrl is required");
  if (!opts.tenantId) throw new LicensesApiError("listMyLicenses: tenantId is required");
  const fetchImpl = opts.fetchImpl ?? fetch;
  const params = new URLSearchParams();
  if (opts.page) params.set("page", String(opts.page));
  if (opts.perPage) params.set("per_page", String(opts.perPage));
  const url =
    `${opts.baseUrl}/api/v1/me/licenses` + (params.toString() ? `?${params.toString()}` : "");
  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: "GET",
      headers: tenantHeaders(opts.tenantId),
      signal: opts.signal,
    });
  } catch (err) {
    throw new LicensesApiError("listMyLicenses: network error", err);
  }
  if (!res.ok) {
    throw new LicensesApiError(`listMyLicenses: HTTP ${res.status}`);
  }
  try {
    return parseList(await res.json());
  } catch (err) {
    if (err instanceof LicensesApiError) throw err;
    throw new LicensesApiError("listMyLicenses: invalid JSON", err);
  }
}

export async function fetchLicense(opts: FetchLicenseOptions): Promise<License> {
  if (!opts.baseUrl) throw new LicensesApiError("fetchLicense: baseUrl is required");
  if (!opts.tenantId) throw new LicensesApiError("fetchLicense: tenantId is required");
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(`${opts.baseUrl}/api/v1/licenses/${opts.id}`, {
      method: "GET",
      headers: tenantHeaders(opts.tenantId),
      signal: opts.signal,
    });
  } catch (err) {
    throw new LicensesApiError("fetchLicense: network error", err);
  }
  return readLicense(res, "fetchLicense");
}

export async function issueLicense(opts: IssueLicenseOptions): Promise<License> {
  if (!opts.baseUrl) throw new LicensesApiError("issueLicense: baseUrl is required");
  if (!opts.tenantId) throw new LicensesApiError("issueLicense: tenantId is required");
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(`${opts.baseUrl}/api/v1/licenses`, {
      method: "POST",
      headers: { ...tenantHeaders(opts.tenantId), "content-type": "application/json" },
      body: JSON.stringify({
        product_id: opts.productId,
        customer_id: opts.customerId,
        source: opts.source,
        max_activations: opts.maxActivations,
        expires_at: opts.expiresAt,
      }),
      signal: opts.signal,
    });
  } catch (err) {
    throw new LicensesApiError("issueLicense: network error", err);
  }
  return readLicense(res, "issueLicense");
}

export async function revokeLicense(opts: RevokeLicenseOptions): Promise<License> {
  if (!opts.baseUrl) throw new LicensesApiError("revokeLicense: baseUrl is required");
  if (!opts.tenantId) throw new LicensesApiError("revokeLicense: tenantId is required");
  if (!opts.id) throw new LicensesApiError("revokeLicense: id is required");
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(`${opts.baseUrl}/api/v1/licenses/${opts.id}/revoke`, {
      method: "POST",
      headers: tenantHeaders(opts.tenantId),
      signal: opts.signal,
    });
  } catch (err) {
    throw new LicensesApiError("revokeLicense: network error", err);
  }
  return readLicense(res, "revokeLicense");
}

interface RawDownload {
  readonly url?: unknown;
  readonly expires_at?: unknown;
  readonly uses_allowed?: unknown;
}

export async function customerLicenseDownload(
  opts: CustomerDownloadOptions,
): Promise<DigitalDownload> {
  if (!opts.baseUrl) throw new LicensesApiError("customerLicenseDownload: baseUrl is required");
  if (!opts.tenantId) throw new LicensesApiError("customerLicenseDownload: tenantId is required");
  if (!opts.licenseId) throw new LicensesApiError("customerLicenseDownload: licenseId is required");
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(`${opts.baseUrl}/api/v1/me/licenses/${opts.licenseId}/download`, {
      method: "GET",
      headers: tenantHeaders(opts.tenantId),
      signal: opts.signal,
    });
  } catch (err) {
    throw new LicensesApiError("customerLicenseDownload: network error", err);
  }
  if (!res.ok) {
    throw new LicensesApiError(`customerLicenseDownload: HTTP ${res.status}`);
  }
  try {
    const raw = (await res.json()) as RawDownload;
    return {
      url: parseString(raw?.url, "download.url"),
      expiresAt: parseString(raw?.expires_at, "download.expires_at"),
      usesAllowed: parseNumber(raw?.uses_allowed, "download.uses_allowed"),
    };
  } catch (err) {
    if (err instanceof LicensesApiError) throw err;
    throw new LicensesApiError("customerLicenseDownload: invalid JSON", err);
  }
}
