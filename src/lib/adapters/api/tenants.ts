// HTTP adapter for /api/v1/tenants/*. Defensive parsing keeps the
// calling layer free of `any` and surfaces backend payload bugs early.

import type { Tenant } from "@/lib/domain/tenant";
import { isTenantStatus } from "@/lib/domain/tenant";

export class TenantsApiError extends Error {
  override readonly name = "TenantsApiError";
  override readonly cause?: unknown;
  readonly status?: number;
  constructor(message: string, status?: number, cause?: unknown) {
    super(message);
    this.status = status;
    this.cause = cause;
  }
}

export interface TenantsRequestBase {
  readonly baseUrl: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface ListTenantsOptions extends TenantsRequestBase {
  readonly page?: number;
  readonly perPage?: number;
}

export interface CreateTenantOptions extends TenantsRequestBase {
  readonly id?: string;
  readonly slug: string;
  readonly name: string;
  readonly plan?: string;
}

export interface TenantIdOptions extends TenantsRequestBase {
  readonly id: string;
}

export interface UpdateTenantOptions extends TenantIdOptions {
  readonly name?: string;
  readonly plan?: string;
}

export interface TenantsList {
  readonly tenants: readonly Tenant[];
  readonly total: number;
  readonly page: number;
  readonly perPage: number;
}

interface RawTenant {
  readonly id?: unknown;
  readonly slug?: unknown;
  readonly name?: unknown;
  readonly plan?: unknown;
  readonly status?: unknown;
  readonly created_at?: unknown;
  readonly updated_at?: unknown;
}

function asString(value: unknown, label: string): string {
  if (typeof value !== "string" || value === "") {
    throw new TenantsApiError(`${label} must be a non-empty string`);
  }
  return value;
}

export function parseTenant(raw: unknown): Tenant {
  const value = raw as RawTenant;
  const status = asString(value?.status, "tenant.status");
  if (!isTenantStatus(status)) {
    throw new TenantsApiError(`tenant.status invalid: ${status}`);
  }
  return {
    id: asString(value?.id, "tenant.id"),
    slug: asString(value?.slug, "tenant.slug"),
    name: asString(value?.name, "tenant.name"),
    plan: typeof value?.plan === "string" ? value.plan : "free",
    status,
    createdAt: asString(value?.created_at, "tenant.created_at"),
    updatedAt: asString(value?.updated_at, "tenant.updated_at"),
  };
}

async function readJSON(res: Response, label: string): Promise<unknown> {
  if (!res.ok) {
    throw new TenantsApiError(`${label}: HTTP ${res.status}`, res.status);
  }
  try {
    return await res.json();
  } catch (err) {
    throw new TenantsApiError(`${label}: invalid JSON`, res.status, err);
  }
}

export async function listTenants(opts: ListTenantsOptions): Promise<TenantsList> {
  if (!opts.baseUrl) throw new TenantsApiError("listTenants: baseUrl required");
  const fetchImpl = opts.fetchImpl ?? fetch;
  const params = new URLSearchParams();
  if (opts.page) params.set("page", String(opts.page));
  if (opts.perPage) params.set("per_page", String(opts.perPage));
  const url = `${opts.baseUrl}/api/v1/tenants${params.toString() ? `?${params}` : ""}`;
  let res: Response;
  try {
    res = await fetchImpl(url, { method: "GET", signal: opts.signal });
  } catch (err) {
    throw new TenantsApiError("listTenants: network error", undefined, err);
  }
  const raw = (await readJSON(res, "listTenants")) as {
    tenants?: unknown;
    total?: unknown;
    page?: unknown;
    per_page?: unknown;
  };
  if (!Array.isArray(raw?.tenants)) {
    throw new TenantsApiError("listTenants: response.tenants must be an array");
  }
  return {
    tenants: raw.tenants.map(parseTenant),
    total: typeof raw.total === "number" ? raw.total : 0,
    page: typeof raw.page === "number" ? raw.page : 1,
    perPage: typeof raw.per_page === "number" ? raw.per_page : raw.tenants.length,
  };
}

export async function fetchTenant(opts: TenantIdOptions): Promise<Tenant> {
  if (!opts.id) throw new TenantsApiError("fetchTenant: id required");
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(`${opts.baseUrl}/api/v1/tenants/${opts.id}`, { method: "GET", signal: opts.signal });
  } catch (err) {
    throw new TenantsApiError("fetchTenant: network error", undefined, err);
  }
  return parseTenant(await readJSON(res, "fetchTenant"));
}

export async function createTenant(opts: CreateTenantOptions): Promise<Tenant> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(`${opts.baseUrl}/api/v1/tenants`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: opts.id,
        slug: opts.slug,
        name: opts.name,
        plan: opts.plan,
      }),
      signal: opts.signal,
    });
  } catch (err) {
    throw new TenantsApiError("createTenant: network error", undefined, err);
  }
  return parseTenant(await readJSON(res, "createTenant"));
}

export async function updateTenant(opts: UpdateTenantOptions): Promise<Tenant> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const body: Record<string, string> = {};
  if (opts.name !== undefined) body.name = opts.name;
  if (opts.plan !== undefined) body.plan = opts.plan;
  let res: Response;
  try {
    res = await fetchImpl(`${opts.baseUrl}/api/v1/tenants/${opts.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: opts.signal,
    });
  } catch (err) {
    throw new TenantsApiError("updateTenant: network error", undefined, err);
  }
  return parseTenant(await readJSON(res, "updateTenant"));
}

async function postTenantTransition(opts: TenantIdOptions, action: string): Promise<Tenant> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(`${opts.baseUrl}/api/v1/tenants/${opts.id}/${action}`, {
      method: "POST",
      signal: opts.signal,
    });
  } catch (err) {
    throw new TenantsApiError(`${action}: network error`, undefined, err);
  }
  return parseTenant(await readJSON(res, action));
}

export function activateTenant(opts: TenantIdOptions): Promise<Tenant> {
  return postTenantTransition(opts, "activate");
}

export function suspendTenant(opts: TenantIdOptions): Promise<Tenant> {
  return postTenantTransition(opts, "suspend");
}

export function archiveTenant(opts: TenantIdOptions): Promise<Tenant> {
  return postTenantTransition(opts, "archive");
}
