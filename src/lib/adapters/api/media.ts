import {
  createMediaAsset,
  type MediaAsset,
  type MediaMetadata,
  type MediaQAResult,
  type MediaQAStatus,
  type ObjectStoreProvider,
  type ProcessingStatus,
} from "@/lib/domain/media";
import type { components } from "./generated/schema";

type BackendMediaAsset = components["schemas"]["MediaAsset"];
type BackendMediaSourceRequest = components["schemas"]["MediaSourceRequest"];
type BackendMediaQualityReport = components["schemas"]["MediaQualityReport"];

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

export interface ApproveMediaAssetOptions extends MediaApiOptions {
  readonly mediaId: string;
  readonly reviewer: string;
  readonly note?: string;
}

export interface RejectMediaAssetOptions extends MediaApiOptions {
  readonly mediaId: string;
  readonly reviewer: string;
  readonly note: string;
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

const fallbackTimestamp = "1970-01-01T00:00:00.000Z";

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

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() !== "" ? value : fallback;
}

function numberValue(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function filenameFromPath(value: string | undefined): string {
  if (!value) return "";
  try {
    const parsed = new URL(value);
    return parsed.pathname.split("/").filter(Boolean).at(-1) ?? "";
  } catch {
    return value.split("/").filter(Boolean).at(-1) ?? "";
  }
}

function originalFilename(raw: Record<string, unknown>, storage: Record<string, unknown>): string {
  return (
    stringValue(raw["original_filename"]) ||
    filenameFromPath(optionalString(storage["key"])) ||
    filenameFromPath(optionalString(raw["source_url"])) ||
    `${stringValue(raw["id"], "media")}.bin`
  );
}

function reviewState(
  raw: Record<string, unknown>,
  quality: Record<string, unknown>,
  storage: Record<string, unknown>,
): "pending" | "approved" | "rejected" {
  const explicit = raw["review_state"];
  if (explicit === "pending" || explicit === "approved" || explicit === "rejected") {
    return explicit;
  }
  if (typeof quality["pass"] === "boolean" || stringValue(storage["key"]) !== "") return "approved";
  return "pending";
}

function processState(
  raw: Record<string, unknown>,
  quality: Record<string, unknown>,
  storage: Record<string, unknown>,
): "pending" | "processed" {
  const explicit = raw["process_state"];
  if (explicit === "pending" || explicit === "processed") {
    return explicit;
  }
  if (typeof quality["pass"] === "boolean") return "processed";
  if (stringValue(storage["key"]) !== "") return "processed";
  if (Array.isArray(asRecord(raw["processing"])["operations"])) return "processed";
  return "pending";
}

function processingStatus(
  raw: Record<string, unknown>,
  quality: Record<string, unknown>,
  storage: Record<string, unknown>,
): ProcessingStatus {
  const explicit = raw["processing_status"];
  if (
    explicit === "sourced" ||
    explicit === "processing" ||
    explicit === "processed" ||
    explicit === "validated" ||
    explicit === "failed"
  ) {
    return explicit;
  }
  const review = reviewState(raw, quality, storage);
  const process = processState(raw, quality, storage);
  if (review === "rejected") return "failed";
  if (process === "processed") {
    if (typeof quality["pass"] === "boolean") return quality["pass"] ? "validated" : "failed";
    return "processed";
  }
  if (review === "approved") return "processing";
  return "sourced";
}

function qaStatus(pass: unknown, issues: unknown): MediaQAStatus {
  if (pass === true) return "passed";
  if (pass === false) {
    const blocking = Array.isArray(issues)
      ? issues.some((issue) => asRecord(issue)["blocking"] === true)
      : false;
    return blocking ? "failed" : "needs_review";
  }
  return "pending";
}

function qaResult(raw: Record<string, unknown>, quality: Record<string, unknown>): MediaQAResult | undefined {
  const legacy = asRecord(raw["qa_result"]);
  const legacyChecks = legacy["checks"];
  if (typeof legacy["status"] === "string") {
    return {
      status: String(legacy["status"]) as MediaQAStatus,
      score: numberValue(legacy["score"]),
      checkedAt: stringValue(legacy["checked_at"], fallbackTimestamp),
      checks: Array.isArray(legacyChecks)
        ? legacyChecks.map((check) => {
            const item = asRecord(check);
            return {
              code: stringValue(item["code"]),
              status: stringValue(item["status"], "pending") as MediaQAStatus,
              message: stringValue(item["message"]),
            };
          })
        : [],
    };
  }

  if (typeof quality["pass"] !== "boolean" && typeof quality["score"] !== "number") return undefined;
  const issues = Array.isArray(quality["issues"]) ? quality["issues"] : [];
  return {
    status: qaStatus(quality["pass"], issues),
    score: numberValue(quality["score"]),
    checkedAt: stringValue(raw["updated_at"] ?? raw["created_at"], fallbackTimestamp),
    checks: issues.map((issue) => {
      const item = asRecord(issue);
      const blocking = item["blocking"] === true;
      return {
        code: stringValue(item["id"], "media_quality_issue"),
        status: blocking ? "failed" : "needs_review",
        message: stringValue(item["message"], "Media quality issue."),
      };
    }),
  };
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

function mapMediaAsset(rawAsset: unknown): MediaAsset {
  const raw = asRecord(rawAsset);
  const metadata = asRecord(raw["metadata"]);
  const quality = asRecord(raw["quality"]);
  const storage = asRecord(raw["storage"] ?? raw["object_store_location"]);
  const filename = originalFilename(raw, storage);
  const createdAt = stringValue(raw["created_at"], fallbackTimestamp);
  const lifecycleReviewState = reviewState(raw, quality, storage);
  const lifecycleProcessState = processState(raw, quality, storage);

  return createMediaAsset({
    id: String(raw["id"] ?? ""),
    productId: optionalString(raw["product_id"]),
    sourceUrl: optionalString(raw["source_url"]),
    originalFilename: filename,
    mimeType: stringValue(raw["mime_type"] ?? metadata["mime_type"] ?? storage["content_type"]),
    sizeBytes: numberValue(raw["size_bytes"] ?? metadata["content_length"] ?? storage["size_bytes"]),
    width: optionalNumber(raw["width"] ?? metadata["width"]),
    height: optionalNumber(raw["height"] ?? metadata["height"]),
    processingStatus: processingStatus(raw, quality, storage),
    reviewState: lifecycleReviewState,
    processState: lifecycleProcessState,
    reviewNote: optionalString(raw["review_note"]),
    reviewedAt: optionalString(raw["reviewed_at"]),
    reviewer: optionalString(raw["reviewer"]),
    objectStoreLocation: stringValue(storage["key"]) !== ""
      ? {
          provider: stringValue(storage["provider"], "local") as ObjectStoreProvider,
          bucket: stringValue(storage["bucket"], "media"),
          key: stringValue(storage["key"]),
          url: optionalString(storage["url"]),
        }
      : undefined,
    metadata: {
      altText: stringValue(metadata["alt_text"] ?? raw["alt_text"]),
      title: stringValue(metadata["title"], filename),
      tags: stringArray(metadata["tags"]),
    },
    qaResult: qaResult(raw, quality),
    createdAt,
    updatedAt: stringValue(raw["updated_at"], createdAt),
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
  return mapMediaAsset((wrapped.asset ?? body) as BackendMediaAsset);
}

export async function fetchMediaAssets(opts: FetchMediaAssetsOptions): Promise<MediaAsset[]> {
  const params = new URLSearchParams();
  if (opts.productId) params.set("product_id", opts.productId);
  if (opts.status && opts.status !== "all") params.set("status", opts.status);
  const query = params.size > 0 ? `?${params.toString()}` : "";
  let body: { assets?: unknown };
  try {
    body = (await requestJson(
      opts,
      `/api/v1/media${query}`,
      { method: "GET" },
      "fetchMediaAssets",
    )) as { assets?: unknown };
  } catch (err) {
    if (err instanceof MediaApiError && /HTTP (404|405)/.test(err.message)) return [];
    throw err;
  }
  if (!Array.isArray(body.assets)) {
    throw new MediaApiError("fetchMediaAssets: response body must include assets array");
  }
  return body.assets.map((asset) => mapMediaAsset(asset));
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
  if (!opts.sourceUrl) {
    throw new MediaApiError("sourceMedia: sourceUrl is required by the backend media source API");
  }
  const requestBody: BackendMediaSourceRequest = {
    url: opts.sourceUrl,
    ...(opts.productId ? { product_id: opts.productId } : {}),
    ...(opts.metadata.altText ? { alt_text: opts.metadata.altText } : {}),
  };
  const body = await requestJson(
    opts,
    "/api/v1/media/source",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(requestBody),
    },
    "sourceMedia",
  );
  const asset = assetFromBody(body);
  return createMediaAsset({
    ...asset,
    metadata: {
      altText: asset.metadata.altText || opts.metadata.altText,
      title: opts.metadata.title || asset.metadata.title,
      tags: opts.metadata.tags,
    },
  });
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

export async function approveMediaAsset(opts: ApproveMediaAssetOptions): Promise<MediaAsset> {
  const mediaId = encodeURIComponent(opts.mediaId);
  const body = await requestJson(
    opts,
    `/api/v1/media/${mediaId}/approve`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        reviewer: opts.reviewer,
        ...(opts.note ? { note: opts.note } : {}),
      }),
    },
    "approveMediaAsset",
  );
  return assetFromBody(body);
}

export async function rejectMediaAsset(opts: RejectMediaAssetOptions): Promise<MediaAsset> {
  const mediaId = encodeURIComponent(opts.mediaId);
  const body = await requestJson(
    opts,
    `/api/v1/media/${mediaId}/reject`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        reviewer: opts.reviewer,
        note: opts.note,
      }),
    },
    "rejectMediaAsset",
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
  const bodyRecord = asRecord(body);
  if (bodyRecord["id"] || bodyRecord["asset"]) return assetFromBody(body);

  const quality = body as BackendMediaQualityReport;
  const asset = await fetchMediaAsset(opts);
  return createMediaAsset({
    ...asset,
    qaResult: qaResult(
      {
        id: asset.id,
        created_at: asset.createdAt,
        updated_at: new Date().toISOString(),
      },
      asRecord(quality),
    ),
    processingStatus: quality.pass ? "validated" : "failed",
    updatedAt: new Date().toISOString(),
  });
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
