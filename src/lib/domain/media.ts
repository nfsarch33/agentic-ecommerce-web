export type ProcessingStatus = "sourced" | "processing" | "processed" | "validated" | "failed";
export type MediaQAStatus = "pending" | "passed" | "needs_review" | "failed";
export type ObjectStoreProvider = "local" | "s3" | "gcs";
export type StatusTone = "blue" | "amber" | "green" | "red" | "gray";
export type MediaReviewState = "pending" | "approved" | "rejected";
export type MediaProcessState = "pending" | "processed";

export interface ObjectStoreLocation {
  readonly provider: ObjectStoreProvider;
  readonly bucket: string;
  readonly key: string;
  readonly url?: string;
}

export interface MediaMetadata {
  readonly altText: string;
  readonly title: string;
  readonly tags: readonly string[];
}

export interface MediaQACheck {
  readonly code: string;
  readonly status: MediaQAStatus;
  readonly message: string;
}

export interface MediaQAResult {
  readonly status: MediaQAStatus;
  readonly score: number;
  readonly checkedAt: string;
  readonly checks: readonly MediaQACheck[];
}

export interface MediaAssetInput {
  readonly id: string;
  readonly productId?: string;
  readonly sourceUrl?: string;
  readonly originalFilename: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly width?: number;
  readonly height?: number;
  readonly processingStatus: ProcessingStatus;
  readonly objectStoreLocation?: ObjectStoreLocation;
  readonly metadata: MediaMetadata;
  readonly reviewState?: MediaReviewState;
  readonly processState?: MediaProcessState;
  readonly reviewNote?: string;
  readonly reviewedAt?: string;
  readonly reviewer?: string;
  readonly qaResult?: MediaQAResult;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface MediaAsset extends MediaAssetInput {
  readonly metadata: MediaMetadata;
  readonly qaResult?: MediaQAResult;
}

export class MediaDomainError extends Error {
  override readonly name = "MediaDomainError";
}

const processingStatuses = new Set<ProcessingStatus>([
  "sourced",
  "processing",
  "processed",
  "validated",
  "failed",
]);
const qaStatuses = new Set<MediaQAStatus>(["pending", "passed", "needs_review", "failed"]);
const storeProviders = new Set<ObjectStoreProvider>(["local", "s3", "gcs"]);
const reviewStates = new Set<MediaReviewState>(["pending", "approved", "rejected"]);
const processStates = new Set<MediaProcessState>(["pending", "processed"]);

function parseString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new MediaDomainError(`${label} must be a non-empty string`);
  }
  return value.trim();
}

function parseOptionalString(value: unknown, label: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return parseString(value, label);
}

function parseNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new MediaDomainError(`${label} must be a finite number`);
  }
  return Math.round(value);
}

function parseOptionalNumber(value: unknown, label: string): number | undefined {
  if (value === undefined || value === null) return undefined;
  return parseNumber(value, label);
}

function parseProcessingStatus(value: unknown): ProcessingStatus {
  if (typeof value !== "string" || !processingStatuses.has(value as ProcessingStatus)) {
    throw new MediaDomainError(`processingStatus is invalid: ${String(value)}`);
  }
  return value as ProcessingStatus;
}

function parseQAStatus(value: unknown, label: string): MediaQAStatus {
  if (typeof value !== "string" || !qaStatuses.has(value as MediaQAStatus)) {
    throw new MediaDomainError(`${label} is invalid: ${String(value)}`);
  }
  return value as MediaQAStatus;
}

function parseReviewState(value: unknown): MediaReviewState {
  if (typeof value !== "string" || !reviewStates.has(value as MediaReviewState)) {
    throw new MediaDomainError(`reviewState is invalid: ${String(value)}`);
  }
  return value as MediaReviewState;
}

function parseProcessState(value: unknown): MediaProcessState {
  if (typeof value !== "string" || !processStates.has(value as MediaProcessState)) {
    throw new MediaDomainError(`processState is invalid: ${String(value)}`);
  }
  return value as MediaProcessState;
}

function parseScore(value: unknown, label: string): number {
  const score = parseNumber(value, label);
  if (score < 0 || score > 100) {
    throw new MediaDomainError(`${label} must be between 0 and 100`);
  }
  return score;
}

function parseObjectStoreLocation(input?: ObjectStoreLocation): ObjectStoreLocation | undefined {
  if (!input) return undefined;
  if (!storeProviders.has(input.provider)) {
    throw new MediaDomainError(
      `objectStoreLocation.provider is invalid: ${String(input.provider)}`,
    );
  }
  return {
    provider: input.provider,
    bucket: parseString(input.bucket, "objectStoreLocation.bucket"),
    key: parseString(input.key, "objectStoreLocation.key"),
    url: parseOptionalString(input.url, "objectStoreLocation.url"),
  };
}

export function createMediaMetadata(input: MediaMetadata): MediaMetadata {
  const tags = Array.from(new Set(input.tags.map((tag) => tag.trim()).filter(Boolean)));
  return {
    altText: input.altText.trim(),
    title: parseString(input.title, "metadata.title"),
    tags,
  };
}

function createQAResult(input?: MediaQAResult): MediaQAResult | undefined {
  if (!input) return undefined;
  return {
    status: parseQAStatus(input.status, "qaResult.status"),
    score: parseScore(input.score, "qaResult.score"),
    checkedAt: parseString(input.checkedAt, "qaResult.checkedAt"),
    checks: input.checks.map((check) => ({
      code: parseString(check.code, "qaResult.check.code"),
      status: parseQAStatus(check.status, "qaResult.check.status"),
      message: parseString(check.message, "qaResult.check.message"),
    })),
  };
}

export function createMediaAsset(input: MediaAssetInput): MediaAsset {
  return {
    id: parseString(input.id, "media.id"),
    productId: parseOptionalString(input.productId, "media.productId"),
    sourceUrl: parseOptionalString(input.sourceUrl, "media.sourceUrl"),
    originalFilename: parseString(input.originalFilename, "media.originalFilename"),
    mimeType: parseString(input.mimeType, "media.mimeType"),
    sizeBytes: Math.max(0, parseNumber(input.sizeBytes, "media.sizeBytes")),
    width: parseOptionalNumber(input.width, "media.width"),
    height: parseOptionalNumber(input.height, "media.height"),
    processingStatus: parseProcessingStatus(input.processingStatus),
    objectStoreLocation: parseObjectStoreLocation(input.objectStoreLocation),
    metadata: createMediaMetadata(input.metadata),
    reviewState: parseReviewState(input.reviewState ?? "pending"),
    processState: parseProcessState(input.processState ?? "pending"),
    reviewNote: parseOptionalString(input.reviewNote, "media.reviewNote"),
    reviewedAt: parseOptionalString(input.reviewedAt, "media.reviewedAt"),
    reviewer: parseOptionalString(input.reviewer, "media.reviewer"),
    qaResult: createQAResult(input.qaResult),
    createdAt: parseString(input.createdAt, "media.createdAt"),
    updatedAt: parseString(input.updatedAt, "media.updatedAt"),
  };
}

export function mediaStatusLabel(status: ProcessingStatus): string {
  switch (status) {
    case "sourced":
      return "Sourced";
    case "processing":
      return "Processing";
    case "processed":
      return "Processed";
    case "validated":
      return "Validated";
    case "failed":
      return "Failed";
  }
}

export function mediaStatusTone(status: ProcessingStatus): StatusTone {
  switch (status) {
    case "sourced":
    case "processing":
      return "blue";
    case "processed":
      return "amber";
    case "validated":
      return "green";
    case "failed":
      return "red";
  }
}

export function mediaQAStatusLabel(status: MediaQAStatus): string {
  switch (status) {
    case "pending":
      return "QA pending";
    case "passed":
      return "QA passed";
    case "needs_review":
      return "Needs review";
    case "failed":
      return "QA failed";
  }
}

export function mediaQAStatusTone(status: MediaQAStatus): StatusTone {
  switch (status) {
    case "pending":
      return "gray";
    case "passed":
      return "green";
    case "needs_review":
      return "amber";
    case "failed":
      return "red";
  }
}

export function mediaReviewStateLabel(state: MediaReviewState): string {
  switch (state) {
    case "pending":
      return "Pending review";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
  }
}

export function mediaReviewStateTone(state: MediaReviewState): StatusTone {
  switch (state) {
    case "pending":
      return "amber";
    case "approved":
      return "green";
    case "rejected":
      return "red";
  }
}

export function mediaProcessStateLabel(state: MediaProcessState): string {
  switch (state) {
    case "pending":
      return "Pending";
    case "processed":
      return "Complete";
  }
}

export function mediaProcessStateTone(state: MediaProcessState): StatusTone {
  switch (state) {
    case "pending":
      return "blue";
    case "processed":
      return "green";
  }
}
