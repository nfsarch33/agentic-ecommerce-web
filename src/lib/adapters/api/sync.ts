import type {
  SyncConflict,
  SyncConflictField,
  SyncConflictResolution,
  SyncConflictStatus,
  SyncEvent,
  SyncEventType,
  SyncStatus,
} from "@/lib/domain/sync";
import type { components } from "@/lib/adapters/api/generated/schema";

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
  readonly note?: string;
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

type RawSyncStatus = components["schemas"]["SyncStatus"];
type RawSyncEvent = components["schemas"]["SyncEvent"];
type RawSyncConflict = components["schemas"]["SyncConflict"];
type RawSyncConflictField = components["schemas"]["SyncConflictField"];
type RawConflictsResponse = components["schemas"]["ConflictListResponse"];

const syncEventTypes = new Set<SyncEventType>([
  "product_imported",
  "product_published",
  "inventory_reconciled",
  "conflict_detected",
  "sync_failed",
]);
const conflictStatuses = new Set<SyncConflictStatus>(["pending", "resolved"]);
const resolutions = new Set<SyncConflictResolution>(["local", "remote", "manual"]);
const conflictFieldNames = new Set<SyncConflictField["field"]>(["title", "price", "stock", "description"]);

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

function parseEventType(value: unknown): SyncEventType {
  if (typeof value !== "string" || !syncEventTypes.has(value as SyncEventType)) {
    throw new SyncApiError("sync.event.type is invalid");
  }
  return value as SyncEventType;
}

function parseConflictStatus(value: unknown): SyncConflictStatus {
  if (typeof value !== "string" || !conflictStatuses.has(value as SyncConflictStatus)) {
    throw new SyncApiError("sync.conflict.status is invalid");
  }
  return value as SyncConflictStatus;
}

function parseConflictFieldName(value: unknown): SyncConflictField["field"] {
  if (typeof value !== "string" || !conflictFieldNames.has(value as SyncConflictField["field"])) {
    throw new SyncApiError("sync.conflict.field is invalid");
  }
  return value as SyncConflictField["field"];
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
    totalEvents: parseNumber(value?.total_events, "sync.status.total_events"),
    pendingConflicts: parseNumber(value?.pending_conflicts, "sync.status.pending_conflicts"),
    lastEvent: value?.last_event ? parseEvent(value.last_event) : undefined,
    lastError: parseOptionalString(value?.last_error, "sync.status.last_error"),
    updatedAt: parseString(value?.updated_at, "sync.status.updated_at"),
  };
}

function parseEvent(raw: RawSyncEvent): SyncEvent {
  return {
    id: parseString(raw?.id, "sync.event.id"),
    type: parseEventType(raw?.type),
    productId: parseOptionalString(raw?.product_id, "sync.event.product_id"),
    remoteId: raw?.remote_id === undefined ? undefined : parseNumber(raw.remote_id, "sync.event.remote_id"),
    message: parseOptionalString(raw?.message, "sync.event.message"),
    metadata: raw?.metadata,
    createdAt: parseString(raw?.created_at, "sync.event.created_at"),
  };
}

function parseConflictField(raw: RawSyncConflictField): SyncConflictField {
  return {
    field: parseConflictFieldName(raw?.field),
    localValue: parseString(raw?.local_value, "sync.conflict.field.local_value"),
    remoteValue: parseString(raw?.remote_value, "sync.conflict.field.remote_value"),
  };
}

function parseConflict(raw: unknown): SyncConflict {
  const value = raw as RawSyncConflict;
  if (!Array.isArray(value?.fields)) {
    throw new SyncApiError("sync.conflict.fields must be an array");
  }
  return {
    id: parseString(value?.id, "sync.conflict.id"),
    productId: parseOptionalString(value?.product_id, "sync.conflict.product_id"),
    sku: parseString(value?.sku, "sync.conflict.sku"),
    remoteId: parseNumber(value?.remote_id, "sync.conflict.remote_id"),
    status: parseConflictStatus(value?.status),
    fields: value.fields.map(parseConflictField),
    resolution: parseResolution(value?.resolution),
    note: parseOptionalString(value?.note, "sync.conflict.note"),
    createdAt: parseString(value?.created_at, "sync.conflict.created_at"),
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
        body: JSON.stringify({ resolution: opts.resolution, ...(opts.note ? { note: opts.note } : {}) }),
        signal: opts.signal,
      },
    );
  } catch (err) {
    throw new SyncApiError("resolveSyncConflict: network error", err);
  }
  return parseConflict(await readJson(res, "resolveSyncConflict"));
}
