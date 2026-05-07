import {
  createMediaAsset,
  type MediaAsset,
  type MediaMetadata,
  type MediaQAStatus,
  type ObjectStoreProvider,
  type ProcessingStatus,
} from "@/lib/domain/media";

export interface MediaApiOptions {
  readonly baseUrl: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface FetchMediaAssetsOptions extends MediaApiOptions {
  readonly productId?: string;
  readonly status?: ProcessingStatus | "all";
}

export interface FetchMediaAssetOptions extends MediaApiOptions {
  readonly mediaId: string;
}

export interface SourceMediaFileMetadata {
  readonly name: string;
  readonly type: string;
  readonly size: number;
  readonly width?: number;
  readonly height?: number;
}

export interface SourceMediaOptions extends MediaApiOptions {
  readonly sourceUrl?: string;
  readonly productId?: string;
  readonly file?: SourceMediaFileMetadata;
  readonly metadata: MediaMetadata;
}

export interface ProcessMediaAssetOptions extends MediaApiOptions {
  readonly mediaId: string;
}

export interface ValidateMediaAssetOptions extends MediaApiOptions {
  readonly mediaId: string;
}

export interface UpdateMediaMetadataOptions extends MediaApiOptions {
  readonly mediaId: string;
  readonly metadata: MediaMetadata;
}

export class MediaApiError extends Error {
  override readonly name = "MediaApiError";
  override readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.cause = cause;
  }
}

interface RawMediaAsset {
  readonly id?: unknown;
  readonly product_id?: unknown;
  readonly source_url?: unknown;
  readonly original_filename?: unknown;
  readonly mime_type?: unknown;
  readonly size_bytes?: unknown;
  readonly width?: unknown;
  readonly height?: unknown;
  readonly processing_status?: unknown;
  readonly object_store_location?: {
    readonly provider?: unknown;
    readonly bucket?: unknown;
    readonly key?: unknown;
    readonly url?: unknown;
  };
  readonly metadata?: {
    readonly alt_text?: unknown;
    readonly title?: unknown;
    readonly tags?: unknown;
  };
  readonly qa_result?: {
    readonly status?: unknown;
    readonly score?: unknown;
    readonly checked_at?: unknown;
    readonly checks?: unknown;
  };
  readonly created_at?: unknown;
  readonly updated_at?: unknown;
}

interface RawMediaQACheck {
  readonly code?: unknown;
  readonly status?: unknown;
  readonly message?: unknown;
}

function apiUrl(baseUrl: string, path: string): string {
  if (!baseUrl) throw new MediaApiError("media API: baseUrl is required");
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function metadataBody(metadata: MediaMetadata): {
  alt_text: string;
  title: string;
  tags: readonly string[];
} {
  return {
    alt_text: metadata.altText,
    title: metadata.title,
    tags: metadata.tags,
  };
}

function mapMediaAsset(raw: RawMediaAsset): MediaAsset {
  const metadata = raw.metadata ?? {};
  const qaResult = raw.qa_result;
  const checks = Array.isArray(qaResult?.checks) ? qaResult.checks : [];
  const objectStoreLocation = raw.object_store_location;

  return createMediaAsset({
    id: String(raw.id ?? ""),
    productId: optionalString(raw.product_id),
    sourceUrl: optionalString(raw.source_url),
    originalFilename: String(raw.original_filename ?? ""),
    mimeType: String(raw.mime_type ?? ""),
    sizeBytes: typeof raw.size_bytes === "number" ? raw.size_bytes : 0,
    width: optionalNumber(raw.width),
    height: optionalNumber(raw.height),
    processingStatus: String(raw.processing_status ?? "") as ProcessingStatus,
    objectStoreLocation: objectStoreLocation
      ? {
          provider: String(objectStoreLocation.provider ?? "") as ObjectStoreProvider,
          bucket: String(objectStoreLocation.bucket ?? ""),
          key: String(objectStoreLocation.key ?? ""),
          url: optionalString(objectStoreLocation.url),
        }
      : undefined,
    metadata: {
      altText: typeof metadata.alt_text === "string" ? metadata.alt_text : "",
      title: String(metadata.title ?? raw.original_filename ?? ""),
      tags: Array.isArray(metadata.tags)
        ? metadata.tags.filter((tag): tag is string => typeof tag === "string")
        : [],
    },
    qaResult: qaResult
      ? {
          status: String(qaResult.status ?? "") as MediaQAStatus,
          score: typeof qaResult.score === "number" ? qaResult.score : 0,
          checkedAt: String(qaResult.checked_at ?? ""),
          checks: checks.map((check) => {
            const rawCheck = check as RawMediaQACheck;
            return {
              code: String(rawCheck.code ?? ""),
              status: String(rawCheck.status ?? "") as MediaQAStatus,
              message: String(rawCheck.message ?? ""),
            };
          }),
        }
      : undefined,
    createdAt: String(raw.created_at ?? ""),
    updatedAt: String(raw.updated_at ?? ""),
  });
}

async function readJson(res: Response, label: string): Promise<unknown> {
  try {
    return await res.json();
  } catch (err) {
    throw new MediaApiError(`${label}: invalid JSON`, err);
  }
}

async function requestJson(
  opts: MediaApiOptions,
  path: string,
  init: RequestInit,
  label: string,
): Promise<unknown> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(apiUrl(opts.baseUrl, path), {
      headers: { accept: "application/json", ...init.headers },
      signal: opts.signal,
      ...init,
    });
  } catch (err) {
    throw new MediaApiError(`${label}: network error`, err);
  }
  if (!res.ok) throw new MediaApiError(`${label}: HTTP ${res.status}`);
  return readJson(res, label);
}

function assetFromBody(body: unknown): MediaAsset {
  const wrapped = body as { asset?: unknown };
  return mapMediaAsset((wrapped.asset ?? body) as RawMediaAsset);
}

export async function fetchMediaAssets(opts: FetchMediaAssetsOptions): Promise<MediaAsset[]> {
  const params = new URLSearchParams();
  if (opts.productId) params.set("product_id", opts.productId);
  if (opts.status && opts.status !== "all") params.set("status", opts.status);
  const query = params.size > 0 ? `?${params.toString()}` : "";
  const body = (await requestJson(
    opts,
    `/api/v1/media${query}`,
    { method: "GET" },
    "fetchMediaAssets",
  )) as { assets?: unknown };
  if (!Array.isArray(body.assets)) {
    throw new MediaApiError("fetchMediaAssets: response body must include assets array");
  }
  return body.assets.map((asset) => mapMediaAsset(asset as RawMediaAsset));
}

export async function fetchMediaAsset(opts: FetchMediaAssetOptions): Promise<MediaAsset> {
  const mediaId = encodeURIComponent(opts.mediaId);
  const body = await requestJson(
    opts,
    `/api/v1/media/${mediaId}`,
    { method: "GET" },
    "fetchMediaAsset",
  );
  return assetFromBody(body);
}

export async function sourceMedia(opts: SourceMediaOptions): Promise<MediaAsset> {
  if (!opts.sourceUrl && !opts.file) {
    throw new MediaApiError("sourceMedia: sourceUrl or file metadata is required");
  }
  const body = await requestJson(
    opts,
    "/api/v1/media/source",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...(opts.sourceUrl ? { source_url: opts.sourceUrl } : {}),
        ...(opts.productId ? { product_id: opts.productId } : {}),
        ...(opts.file ? { file: opts.file } : {}),
        metadata: metadataBody(opts.metadata),
      }),
    },
    "sourceMedia",
  );
  return assetFromBody(body);
}

export async function processMediaAsset(opts: ProcessMediaAssetOptions): Promise<MediaAsset> {
  const body = await requestJson(
    opts,
    "/api/v1/media/process",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ media_id: opts.mediaId }),
    },
    "processMediaAsset",
  );
  return assetFromBody(body);
}

export async function validateMediaAsset(opts: ValidateMediaAssetOptions): Promise<MediaAsset> {
  const mediaId = encodeURIComponent(opts.mediaId);
  const body = await requestJson(
    opts,
    `/api/v1/media/${mediaId}/validate`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
    },
    "validateMediaAsset",
  );
  return assetFromBody(body);
}

export async function updateMediaMetadata(opts: UpdateMediaMetadataOptions): Promise<MediaAsset> {
  const mediaId = encodeURIComponent(opts.mediaId);
  const body = await requestJson(
    opts,
    `/api/v1/media/${mediaId}/metadata`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ metadata: metadataBody(opts.metadata) }),
    },
    "updateMediaMetadata",
  );
  return assetFromBody(body);
}
