import {
  MarketplaceApiError,
  type ListMarketplacePluginsOptions,
  type MarketplacePluginsList,
  listMarketplacePlugins as listAdapter,
} from "@/lib/adapters/api/marketplace";
import type { PluginManifest } from "@/lib/domain/marketplace";

export interface ListPublicMarketplaceUsecaseDeps {
  readonly listImpl?: (opts: ListMarketplacePluginsOptions) => Promise<MarketplacePluginsList>;
}

export interface ListPublicMarketplaceUsecaseInput {
  readonly baseUrl: string;
  readonly tenantId: string;
  readonly category?: string;
  readonly query?: string;
  readonly page?: number;
  readonly perPage?: number;
}

export interface ListPublicMarketplaceUsecaseOutput {
  readonly plugins: readonly PluginManifest[];
  readonly categories: readonly string[];
  readonly total: number;
  readonly error?: string;
}

const PUBLIC_TENANT_ID = "tenant_public";

/**
 * listPublicMarketplaceUsecase loads plugins for the public storefront.
 * Auth is not required; the backend treats the public tenant id as a
 * read-only marker and returns the global catalogue.
 *
 * Filtering happens client-side because the v2.4.0 catalogue API does
 * not yet expose a search endpoint. v2.9.0 can promote category +
 * query filters to the backend in v2 preview without breaking this
 * call site.
 */
export async function listPublicMarketplaceUsecase(
  input: ListPublicMarketplaceUsecaseInput,
  deps: ListPublicMarketplaceUsecaseDeps = {},
): Promise<ListPublicMarketplaceUsecaseOutput> {
  const fn = deps.listImpl ?? listAdapter;
  try {
    const list = await fn({
      baseUrl: input.baseUrl,
      tenantId: input.tenantId || PUBLIC_TENANT_ID,
      page: input.page,
      perPage: input.perPage ?? 50,
    });
    const filtered = filterPlugins(list.plugins, input.query, input.category);
    return {
      plugins: filtered,
      categories: collectCategories(list.plugins),
      total: filtered.length,
    };
  } catch (err) {
    if (err instanceof MarketplaceApiError) {
      return { plugins: [], categories: [], total: 0, error: err.message };
    }
    throw err;
  }
}

function filterPlugins(
  plugins: readonly PluginManifest[],
  query?: string,
  category?: string,
): readonly PluginManifest[] {
  const q = query?.trim().toLowerCase() ?? "";
  return plugins.filter((p) => {
    if (category && p.category !== category) return false;
    if (!q) return true;
    if (p.name.toLowerCase().includes(q)) return true;
    if (p.vendor.toLowerCase().includes(q)) return true;
    if (p.slug.toLowerCase().includes(q)) return true;
    if (p.description?.toLowerCase().includes(q)) return true;
    return false;
  });
}

function collectCategories(plugins: readonly PluginManifest[]): readonly string[] {
  const set = new Set<string>();
  for (const plugin of plugins) {
    if (plugin.category) set.add(plugin.category);
  }
  return Array.from(set).sort();
}
