import { fetchMediaAssets, type FetchMediaAssetsOptions } from "@/lib/adapters/api/media";
import type { MediaAsset, ProcessingStatus } from "@/lib/domain/media";

export interface LoadMediaLibraryInput {
  readonly baseUrl: string;
  readonly status?: ProcessingStatus | "all";
  readonly productId?: string;
}

export interface LoadProductMediaInput {
  readonly baseUrl: string;
  readonly productId: string;
}

export interface LoadMediaLibraryResult {
  readonly assets: readonly MediaAsset[];
}

export interface LoadMediaLibraryDeps {
  readonly fetchMediaAssetsImpl?: (opts: FetchMediaAssetsOptions) => Promise<readonly MediaAsset[]>;
}

export async function loadMediaLibrary(
  input: LoadMediaLibraryInput,
  deps: LoadMediaLibraryDeps = {},
): Promise<LoadMediaLibraryResult> {
  const fetchMediaAssetsImpl = deps.fetchMediaAssetsImpl ?? fetchMediaAssets;
  const assets = await fetchMediaAssetsImpl({
    baseUrl: input.baseUrl,
    status: input.status,
    productId: input.productId,
  });
  return { assets };
}

export async function loadProductMedia(
  input: LoadProductMediaInput,
  deps: LoadMediaLibraryDeps = {},
): Promise<LoadMediaLibraryResult> {
  const fetchMediaAssetsImpl = deps.fetchMediaAssetsImpl ?? fetchMediaAssets;
  const assets = await fetchMediaAssetsImpl({
    baseUrl: input.baseUrl,
    productId: input.productId,
  });
  return { assets };
}
