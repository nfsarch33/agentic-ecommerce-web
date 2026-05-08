import {
  MarketplaceApiError,
  type PluginSlugOptions,
  installMarketplacePlugin as installAdapter,
  activateMarketplacePlugin as activateAdapter,
  deactivateMarketplacePlugin as deactivateAdapter,
  uninstallMarketplacePlugin as uninstallAdapter,
} from "@/lib/adapters/api/marketplace";
import type { Installation } from "@/lib/domain/marketplace";

export type LifecycleResult =
  | { readonly ok: true; readonly installation: Installation }
  | { readonly ok: false; readonly error: string };

export interface PluginUsecaseDeps {
  readonly installImpl?: (opts: PluginSlugOptions) => Promise<Installation>;
  readonly activateImpl?: (opts: PluginSlugOptions) => Promise<Installation>;
  readonly deactivateImpl?: (opts: PluginSlugOptions) => Promise<Installation>;
  readonly uninstallImpl?: (opts: PluginSlugOptions) => Promise<void>;
}

function toResult(installation: Installation): LifecycleResult {
  return { ok: true, installation };
}

function toError(err: unknown): LifecycleResult {
  if (err instanceof MarketplaceApiError) return { ok: false, error: err.message };
  if (err instanceof Error) return { ok: false, error: err.message };
  return { ok: false, error: "unknown error" };
}

export async function installPluginUsecase(
  opts: PluginSlugOptions,
  deps: PluginUsecaseDeps = {},
): Promise<LifecycleResult> {
  const fn = deps.installImpl ?? installAdapter;
  try {
    return toResult(await fn(opts));
  } catch (err) {
    return toError(err);
  }
}

export async function activatePluginUsecase(
  opts: PluginSlugOptions,
  deps: PluginUsecaseDeps = {},
): Promise<LifecycleResult> {
  const fn = deps.activateImpl ?? activateAdapter;
  try {
    return toResult(await fn(opts));
  } catch (err) {
    return toError(err);
  }
}

export async function deactivatePluginUsecase(
  opts: PluginSlugOptions,
  deps: PluginUsecaseDeps = {},
): Promise<LifecycleResult> {
  const fn = deps.deactivateImpl ?? deactivateAdapter;
  try {
    return toResult(await fn(opts));
  } catch (err) {
    return toError(err);
  }
}

export async function uninstallPluginUsecase(
  opts: PluginSlugOptions,
  deps: PluginUsecaseDeps = {},
): Promise<{ readonly ok: true } | { readonly ok: false; readonly error: string }> {
  const fn = deps.uninstallImpl ?? uninstallAdapter;
  try {
    await fn(opts);
    return { ok: true };
  } catch (err) {
    if (err instanceof MarketplaceApiError) return { ok: false, error: err.message };
    if (err instanceof Error) return { ok: false, error: err.message };
    return { ok: false, error: "unknown error" };
  }
}
