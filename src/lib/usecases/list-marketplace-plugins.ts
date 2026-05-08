import {
  MarketplaceApiError,
  type ListMarketplacePluginsOptions,
  type MarketplacePluginsList,
  listMarketplacePlugins as listAdapter,
} from "@/lib/adapters/api/marketplace";
import type { Installation, PluginManifest } from "@/lib/domain/marketplace";

export interface ListMarketplacePluginsUsecaseDeps {
  readonly listImpl?: (opts: ListMarketplacePluginsOptions) => Promise<MarketplacePluginsList>;
}

export interface ListMarketplacePluginsUsecaseInput {
  readonly baseUrl: string;
  readonly tenantId: string;
  readonly page?: number;
  readonly perPage?: number;
}

export interface ListMarketplacePluginsUsecaseOutput {
  readonly plugins: readonly PluginManifest[];
  readonly total: number;
  readonly error?: string;
}

export async function listMarketplacePluginsUsecase(
  input: ListMarketplacePluginsUsecaseInput,
  deps: ListMarketplacePluginsUsecaseDeps = {},
): Promise<ListMarketplacePluginsUsecaseOutput> {
  const fn = deps.listImpl ?? listAdapter;
  try {
    const list = await fn(input);
    return { plugins: list.plugins, total: list.total };
  } catch (err) {
    if (err instanceof MarketplaceApiError) {
      return { plugins: [], total: 0, error: err.message };
    }
    throw err;
  }
}

// Lifecycle helpers re-exported as small usecases so colocated tests
// can mock the adapter without import cycles.
export type LifecycleResult =
  | { readonly ok: true; readonly installation: Installation }
  | { readonly ok: false; readonly error: string };
