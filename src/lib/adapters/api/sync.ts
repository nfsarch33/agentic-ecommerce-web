import type {
  SyncConflict,
  SyncConflictResolution,
  SyncConflictStatus,
  SyncResourceType,
  SyncState,
  SyncStatus,
} from "@/lib/domain/sync";

export interface FetchSyncStatusOptions {
  readonly baseUrl: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface FetchSyncConflictsOptions {
  readonly baseUrl: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface ResolveSyncConflictOptions {
  readonly baseUrl: string;
  readonly conflictId: string;
  readonly resolution: SyncConflictResolution;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export class SyncApiError extends Error {
  override readonly name = "SyncApiError";
  override readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.cause = cause;
  }
}

interface RawSyncStatus {
  readonly state?: unknown;
  readonly last_sync_at?: unknown;
  readonly next_sync_at?: unknown;
  readonly sync_lag_seconds?: unknown;
  readonly in_flight_jobs?: unknown;
  readonly queued_events?: unknown;
  readonly conflict_count?: unknown;
  readonly error_count?: unknown;
  readonly last_error?: unknown;
  readonly updated_at?: unknown;
}

interface RawSyncConflict {
  readonly id?: unknown;
  readonly resource_type?: unknown;
  readonly resource_id?: unknown;
  readonly field?: unknown;
  readonly backend_value?: unknown;
  readonly woocommerce_value?: unknown;
  readonly local_updated_at?: unknown;
  readonly remote_updated_at?: unknown;
  readonly detected_at?: unknown;
  readonly status?: unknown;
  readonly resolution?: unknown;
  readonly resolved_at?: unknown;
}

interface RawConflictsResponse {
  readonly conflicts?: unknown;
}

interface RawResolveResponse {
  readonly conflict?: unknown;
}

const syncStates = new Set<SyncState>(["idle", "running", "degraded", "failed"]);
const resourceTypes = new Set<SyncResourceType>(["product", "order", "inventory"]);
const conflictStatuses = new Set<SyncConflictStatus>(["open", "resolved"]);
const resolutions = new Set<SyncConflictResolution>(["accept_local", "accept_remote", "mark_resolved"]);

function apiUrl(baseUrl: string, path: string): string {
  if (!baseUrl) throw new SyncApiError("sync API: baseUrl is required");
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

function parseString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new SyncApiError(`${label} must be a non-empty string`);
  }
  return value;
}

function parseOptionalString(value: unknown, label: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return parseString(value, label);
}

function parseNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new SyncApiError(`${label} must be a non-negative number`);
  }
  return value;
}

function parseState(value: unknown): SyncState {
  if (typeof value !== "string" || !syncStates.has(value as SyncState)) {
    throw new SyncApiError("sync.status.state is invalid");
  }
  return value as SyncState;
}

function parseResourceType(value: unknown): SyncResourceType {
  if (typeof value !== "string" || !resourceTypes.has(value as SyncResourceType)) {
    throw new SyncApiError("sync.conflict.resource_type is invalid");
  }
  return value as SyncResourceType;
}

function parseConflictStatus(value: unknown): SyncConflictStatus {
  if (typeof value !== "string" || !conflictStatuses.has(value as SyncConflictStatus)) {
    throw new SyncApiError("sync.conflict.status is invalid");
  }
  return value as SyncConflictStatus;
}

function parseResolution(value: unknown): SyncConflictResolution | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !resolutions.has(value as SyncConflictResolution)) {
    throw new SyncApiError("sync.conflict.resolution is invalid");
  }
  return value as SyncConflictResolution;
}

function parseStatus(raw: unknown): SyncStatus {
  const value = raw as RawSyncStatus;
  return {
    state: parseState(value?.state),
    lastSyncAt: parseOptionalString(value?.last_sync_at, "sync.status.last_sync_at"),
    nextSyncAt: parseOptionalString(value?.next_sync_at, "sync.status.next_sync_at"),
    syncLagSeconds: parseNumber(value?.sync_lag_seconds, "sync.status.sync_lag_seconds"),
    inFlightJobs: parseNumber(value?.in_flight_jobs, "sync.status.in_flight_jobs"),
    queuedEvents: parseNumber(value?.queued_events, "sync.status.queued_events"),
    conflictCount: parseNumber(value?.conflict_count, "sync.status.conflict_count"),
    errorCount: parseNumber(value?.error_count, "sync.status.error_count"),
    lastError: parseOptionalString(value?.last_error, "sync.status.last_error"),
    updatedAt: parseString(value?.updated_at, "sync.status.updated_at"),
  };
}

function parseConflict(raw: unknown): SyncConflict {
  const value = raw as RawSyncConflict;
  return {
    id: parseString(value?.id, "sync.conflict.id"),
    resourceType: parseResourceType(value?.resource_type),
    resourceId: parseString(value?.resource_id, "sync.conflict.resource_id"),
    field: parseString(value?.field, "sync.conflict.field"),
    backendValue: value?.backend_value,
    wooCommerceValue: value?.woocommerce_value,
    localUpdatedAt: parseString(value?.local_updated_at, "sync.conflict.local_updated_at"),
    remoteUpdatedAt: parseString(value?.remote_updated_at, "sync.conflict.remote_updated_at"),
    detectedAt: parseString(value?.detected_at, "sync.conflict.detected_at"),
    status: parseConflictStatus(value?.status),
    resolution: parseResolution(value?.resolution),
    resolvedAt: parseOptionalString(value?.resolved_at, "sync.conflict.resolved_at"),
  };
}

async function readJson(res: Response, label: string): Promise<unknown> {
  if (!res.ok) {
    throw new SyncApiError(`${label}: HTTP ${res.status}`);
  }
  try {
    return await res.json();
  } catch (err) {
    throw new SyncApiError(`${label}: invalid JSON`, err);
  }
}

export async function fetchSyncStatus(opts: FetchSyncStatusOptions): Promise<SyncStatus> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(apiUrl(opts.baseUrl, "/api/v1/sync/status"), {
      method: "GET",
      headers: { accept: "application/json" },
      signal: opts.signal,
    });
  } catch (err) {
    throw new SyncApiError("fetchSyncStatus: network error", err);
  }
  return parseStatus(await readJson(res, "fetchSyncStatus"));
}

export async function fetchSyncConflicts(opts: FetchSyncConflictsOptions): Promise<SyncConflict[]> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(apiUrl(opts.baseUrl, "/api/v1/sync/conflicts"), {
      method: "GET",
      headers: { accept: "application/json" },
      signal: opts.signal,
    });
  } catch (err) {
    throw new SyncApiError("fetchSyncConflicts: network error", err);
  }
  const raw = (await readJson(res, "fetchSyncConflicts")) as RawConflictsResponse;
  if (!Array.isArray(raw.conflicts)) {
    throw new SyncApiError("fetchSyncConflicts: response body must include conflicts array");
  }
  return raw.conflicts.map(parseConflict);
}

export async function resolveSyncConflict(opts: ResolveSyncConflictOptions): Promise<SyncConflict> {
  if (!opts.conflictId) throw new SyncApiError("resolveSyncConflict: conflictId is required");
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(
      apiUrl(opts.baseUrl, `/api/v1/sync/conflicts/${encodeURIComponent(opts.conflictId)}/resolve`),
      {
        method: "POST",
        headers: { accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify({ resolution: opts.resolution }),
        signal: opts.signal,
      },
    );
  } catch (err) {
    throw new SyncApiError("resolveSyncConflict: network error", err);
  }
  const raw = (await readJson(res, "resolveSyncConflict")) as RawResolveResponse | RawSyncConflict;
  return parseConflict("conflict" in raw ? raw.conflict : raw);
}
