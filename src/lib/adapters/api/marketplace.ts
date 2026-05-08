// HTTP adapter for /api/v1/marketplace/*. Defensive parsing keeps
// the calling layer free of `any` and surfaces backend payload bugs
// early.

import type { Installation, PluginManifest, PluginManifestDependency } from "@/lib/domain/marketplace";
import { isInstallationState } from "@/lib/domain/marketplace";

export class MarketplaceApiError extends Error {
  override readonly name = "MarketplaceApiError";
  override readonly cause?: unknown;
  readonly status?: number;
  constructor(message: string, status?: number, cause?: unknown) {
    super(message);
    this.status = status;
    this.cause = cause;
  }
}

export interface MarketplaceRequestBase {
  readonly baseUrl: string;
  readonly tenantId: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface ListMarketplacePluginsOptions extends MarketplaceRequestBase {
  readonly page?: number;
  readonly perPage?: number;
}

export interface PluginSlugOptions extends MarketplaceRequestBase {
  readonly slug: string;
}

export interface MarketplacePluginsList {
  readonly plugins: readonly PluginManifest[];
  readonly total: number;
  readonly page: number;
  readonly perPage: number;
}

interface RawDependency {
  readonly slug?: unknown;
  readonly constraint?: unknown;
}

interface RawManifest {
  readonly slug?: unknown;
  readonly name?: unknown;
  readonly version?: unknown;
  readonly vendor?: unknown;
  readonly description?: unknown;
  readonly category?: unknown;
  readonly homepage_url?: unknown;
  readonly event_subscriptions?: unknown;
  readonly permissions?: unknown;
  readonly dependencies?: unknown;
}

interface RawInstallation {
  readonly tenant_id?: unknown;
  readonly slug?: unknown;
  readonly installed_version?: unknown;
  readonly state?: unknown;
  readonly installed_at?: unknown;
  readonly activated_at?: unknown;
  readonly updated_at?: unknown;
}

function tenantHeaders(tenantId: string): HeadersInit {
  return { "x-tenant-id": tenantId };
}

function asString(value: unknown, label: string): string {
  if (typeof value !== "string" || value === "") {
    throw new MarketplaceApiError(`${label} must be a non-empty string`);
  }
  return value;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

function asStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function parseDependency(raw: unknown): PluginManifestDependency {
  const value = raw as RawDependency;
  return {
    slug: asString(value?.slug, "dependency.slug"),
    constraint: asOptionalString(value?.constraint),
  };
}

export function parseManifest(raw: unknown): PluginManifest {
  const value = raw as RawManifest;
  return {
    slug: asString(value?.slug, "manifest.slug"),
    name: asString(value?.name, "manifest.name"),
    version: asString(value?.version, "manifest.version"),
    vendor: asString(value?.vendor, "manifest.vendor"),
    description: asOptionalString(value?.description),
    category: asOptionalString(value?.category),
    homepageUrl: asOptionalString(value?.homepage_url),
    eventSubscriptions: asStringArray(value?.event_subscriptions),
    permissions: asStringArray(value?.permissions),
    dependencies: Array.isArray(value?.dependencies) ? value!.dependencies.map(parseDependency) : [],
  };
}

export function parseInstallation(raw: unknown): Installation {
  const value = raw as RawInstallation;
  const state = asString(value?.state, "installation.state");
  if (!isInstallationState(state)) {
    throw new MarketplaceApiError(`installation.state invalid: ${state}`);
  }
  return {
    tenantId: asString(value?.tenant_id, "installation.tenant_id"),
    slug: asString(value?.slug, "installation.slug"),
    installedVersion: asString(value?.installed_version, "installation.installed_version"),
    state,
    installedAt: asString(value?.installed_at, "installation.installed_at"),
    activatedAt: asOptionalString(value?.activated_at),
    updatedAt: asString(value?.updated_at, "installation.updated_at"),
  };
}

async function readJSON(res: Response, label: string): Promise<unknown> {
  if (!res.ok) {
    throw new MarketplaceApiError(`${label}: HTTP ${res.status}`, res.status);
  }
  try {
    return await res.json();
  } catch (err) {
    throw new MarketplaceApiError(`${label}: invalid JSON`, res.status, err);
  }
}

export async function listMarketplacePlugins(
  opts: ListMarketplacePluginsOptions,
): Promise<MarketplacePluginsList> {
  if (!opts.baseUrl) throw new MarketplaceApiError("listMarketplacePlugins: baseUrl required");
  if (!opts.tenantId) throw new MarketplaceApiError("listMarketplacePlugins: tenantId required");
  const fetchImpl = opts.fetchImpl ?? fetch;
  const params = new URLSearchParams();
  if (opts.page) params.set("page", String(opts.page));
  if (opts.perPage) params.set("per_page", String(opts.perPage));
  const url = `${opts.baseUrl}/api/v1/marketplace/plugins${params.toString() ? `?${params}` : ""}`;
  let res: Response;
  try {
    res = await fetchImpl(url, { method: "GET", headers: tenantHeaders(opts.tenantId), signal: opts.signal });
  } catch (err) {
    throw new MarketplaceApiError("listMarketplacePlugins: network error", undefined, err);
  }
  const raw = (await readJSON(res, "listMarketplacePlugins")) as {
    plugins?: unknown;
    total?: unknown;
    page?: unknown;
    per_page?: unknown;
  };
  if (!Array.isArray(raw?.plugins)) {
    throw new MarketplaceApiError("listMarketplacePlugins: response.plugins must be an array");
  }
  return {
    plugins: raw.plugins.map(parseManifest),
    total: typeof raw.total === "number" ? raw.total : 0,
    page: typeof raw.page === "number" ? raw.page : 1,
    perPage: typeof raw.per_page === "number" ? raw.per_page : raw.plugins.length,
  };
}

export async function fetchMarketplacePlugin(opts: PluginSlugOptions): Promise<PluginManifest> {
  if (!opts.slug) throw new MarketplaceApiError("fetchMarketplacePlugin: slug required");
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(`${opts.baseUrl}/api/v1/marketplace/plugins/${opts.slug}`, {
      method: "GET",
      headers: tenantHeaders(opts.tenantId),
      signal: opts.signal,
    });
  } catch (err) {
    throw new MarketplaceApiError("fetchMarketplacePlugin: network error", undefined, err);
  }
  return parseManifest(await readJSON(res, "fetchMarketplacePlugin"));
}

async function postLifecycle(opts: PluginSlugOptions, action: string): Promise<Installation> {
  if (!opts.slug) throw new MarketplaceApiError(`${action}: slug required`);
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(`${opts.baseUrl}/api/v1/marketplace/plugins/${opts.slug}/${action}`, {
      method: "POST",
      headers: tenantHeaders(opts.tenantId),
      signal: opts.signal,
    });
  } catch (err) {
    throw new MarketplaceApiError(`${action}: network error`, undefined, err);
  }
  return parseInstallation(await readJSON(res, action));
}

export function installMarketplacePlugin(opts: PluginSlugOptions): Promise<Installation> {
  return postLifecycle(opts, "install");
}

export function activateMarketplacePlugin(opts: PluginSlugOptions): Promise<Installation> {
  return postLifecycle(opts, "activate");
}

export function deactivateMarketplacePlugin(opts: PluginSlugOptions): Promise<Installation> {
  return postLifecycle(opts, "deactivate");
}

export async function uninstallMarketplacePlugin(opts: PluginSlugOptions): Promise<void> {
  if (!opts.slug) throw new MarketplaceApiError("uninstall: slug required");
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(`${opts.baseUrl}/api/v1/marketplace/plugins/${opts.slug}`, {
      method: "DELETE",
      headers: tenantHeaders(opts.tenantId),
      signal: opts.signal,
    });
  } catch (err) {
    throw new MarketplaceApiError("uninstall: network error", undefined, err);
  }
  if (!res.ok && res.status !== 204) {
    throw new MarketplaceApiError(`uninstall: HTTP ${res.status}`, res.status);
  }
}

export interface MarketplaceSettings {
  readonly settings: Record<string, unknown>;
}

export async function fetchInstallationSettings(opts: PluginSlugOptions): Promise<MarketplaceSettings> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(`${opts.baseUrl}/api/v1/marketplace/installations/${opts.slug}/settings`, {
      method: "GET",
      headers: tenantHeaders(opts.tenantId),
      signal: opts.signal,
    });
  } catch (err) {
    throw new MarketplaceApiError("fetchInstallationSettings: network error", undefined, err);
  }
  const raw = (await readJSON(res, "fetchInstallationSettings")) as { settings?: unknown };
  return { settings: typeof raw.settings === "object" && raw.settings !== null ? (raw.settings as Record<string, unknown>) : {} };
}

export interface UpdateInstallationSettingsOptions extends PluginSlugOptions {
  readonly values: Record<string, unknown>;
}

export async function updateInstallationSettings(
  opts: UpdateInstallationSettingsOptions,
): Promise<MarketplaceSettings> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(`${opts.baseUrl}/api/v1/marketplace/installations/${opts.slug}/settings`, {
      method: "PATCH",
      headers: { ...tenantHeaders(opts.tenantId), "content-type": "application/json" },
      body: JSON.stringify(opts.values),
      signal: opts.signal,
    });
  } catch (err) {
    throw new MarketplaceApiError("updateInstallationSettings: network error", undefined, err);
  }
  const raw = (await readJSON(res, "updateInstallationSettings")) as { settings?: unknown };
  return { settings: typeof raw.settings === "object" && raw.settings !== null ? (raw.settings as Record<string, unknown>) : {} };
}
