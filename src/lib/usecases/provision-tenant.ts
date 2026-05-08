import {
  TenantsApiError,
  type CreateTenantOptions,
  type TenantIdOptions,
  type ListTenantsOptions,
  type TenantsList,
  createTenant as createAdapter,
  activateTenant as activateAdapter,
  suspendTenant as suspendAdapter,
  archiveTenant as archiveAdapter,
  listTenants as listAdapter,
} from "@/lib/adapters/api/tenants";
import type { Tenant } from "@/lib/domain/tenant";
import { isValidTenantSlug } from "@/lib/domain/tenant";

export type TenantResult =
  | { readonly ok: true; readonly tenant: Tenant }
  | { readonly ok: false; readonly error: string };

export interface TenantUsecaseDeps {
  readonly createImpl?: (opts: CreateTenantOptions) => Promise<Tenant>;
  readonly activateImpl?: (opts: TenantIdOptions) => Promise<Tenant>;
  readonly suspendImpl?: (opts: TenantIdOptions) => Promise<Tenant>;
  readonly archiveImpl?: (opts: TenantIdOptions) => Promise<Tenant>;
  readonly listImpl?: (opts: ListTenantsOptions) => Promise<TenantsList>;
}

function toResult(t: Tenant): TenantResult {
  return { ok: true, tenant: t };
}

function toError(err: unknown): TenantResult {
  if (err instanceof TenantsApiError) return { ok: false, error: err.message };
  if (err instanceof Error) return { ok: false, error: err.message };
  return { ok: false, error: "unknown error" };
}

export async function provisionTenantUsecase(
  opts: CreateTenantOptions,
  deps: TenantUsecaseDeps = {},
): Promise<TenantResult> {
  if (!isValidTenantSlug(opts.slug)) {
    return { ok: false, error: "slug must be kebab-case (lowercase letters, digits, hyphens)" };
  }
  if (opts.name.trim() === "") {
    return { ok: false, error: "name is required" };
  }
  const fn = deps.createImpl ?? createAdapter;
  try {
    return toResult(await fn(opts));
  } catch (err) {
    return toError(err);
  }
}

export async function activateTenantUsecase(
  opts: TenantIdOptions,
  deps: TenantUsecaseDeps = {},
): Promise<TenantResult> {
  const fn = deps.activateImpl ?? activateAdapter;
  try {
    return toResult(await fn(opts));
  } catch (err) {
    return toError(err);
  }
}

export async function suspendTenantUsecase(
  opts: TenantIdOptions,
  deps: TenantUsecaseDeps = {},
): Promise<TenantResult> {
  const fn = deps.suspendImpl ?? suspendAdapter;
  try {
    return toResult(await fn(opts));
  } catch (err) {
    return toError(err);
  }
}

export async function archiveTenantUsecase(
  opts: TenantIdOptions,
  deps: TenantUsecaseDeps = {},
): Promise<TenantResult> {
  const fn = deps.archiveImpl ?? archiveAdapter;
  try {
    return toResult(await fn(opts));
  } catch (err) {
    return toError(err);
  }
}

export async function listTenantsUsecase(
  opts: ListTenantsOptions,
  deps: TenantUsecaseDeps = {},
): Promise<{ readonly tenants: readonly Tenant[]; readonly total: number; readonly error?: string }> {
  const fn = deps.listImpl ?? listAdapter;
  try {
    const list = await fn(opts);
    return { tenants: list.tenants, total: list.total };
  } catch (err) {
    if (err instanceof TenantsApiError) return { tenants: [], total: 0, error: err.message };
    throw err;
  }
}
