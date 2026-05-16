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

export interface FetchMarketplaceSyncDLQOptions {
  readonly baseUrl: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface FetchSyncConflictsOptions {
  readonly baseUrl: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface ReplayMarketplaceSyncDLQOptions {
  readonly baseUrl: string;
  readonly recordId: string;
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

export interface MarketplaceReplayState {
  readonly state: "idle" | "queued" | "applied" | "dlq" | "failed";
  readonly recordId?: string;
  readonly updatedAt?: string;
}

export interface MarketplaceReconciliationState {
  readonly totalLocal: number;
  readonly totalRemote: number;
  readonly mismatchCount: number;
}

export interface MarketplaceSyncStatus extends SyncStatus {
  readonly dlqDepth: number;
  readonly marketplaceReplay: MarketplaceReplayState;
  readonly marketplaceReconciliation: MarketplaceReconciliationState;
}

export interface MarketplaceSyncDLQEvent {
  readonly tenantId: string;
  readonly provider: string;
  readonly entityType: "product";
  readonly entityId: string;
  readonly externalId?: string;
  readonly operation: "upsert" | "delete";
  readonly version: string;
  readonly payload?: Record<string, unknown>;
}

export interface MarketplaceSyncDLQRecord {
  readonly id: string;
  readonly event: MarketplaceSyncDLQEvent;
  readonly attempts: number;
  readonly reason: string;
}

export interface MarketplaceSyncDLQList {
  readonly records: readonly MarketplaceSyncDLQRecord[];
  readonly total: number;
}

export interface MarketplaceDLQReplayResult {
  readonly workflowId: string;
  readonly runId: string;
  readonly status: "started";
  readonly taskQueue: "ec-workflows";
  readonly recordId: string;
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
type RawMarketplaceReplayState = components["schemas"]["MarketplaceReplayState"];
type RawMarketplaceReconciliationState = components["schemas"]["MarketplaceReconciliationState"];
type RawMarketplaceSyncEvent = components["schemas"]["MarketplaceSyncEvent"];
type RawMarketplaceDLQRecord = components["schemas"]["MarketplaceDLQRecord"];
type RawMarketplaceDLQListResponse = components["schemas"]["MarketplaceDLQListResponse"];
type RawWorkflowStartResponse = components["schemas"]["WorkflowStartResponse"];

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

function parseMarketplaceReplayState(raw: RawMarketplaceReplayState): MarketplaceReplayState {
  if (
    typeof raw?.state !== "string" ||
    !new Set<MarketplaceReplayState["state"]>(["idle", "queued", "applied", "dlq", "failed"]).has(
      raw.state as MarketplaceReplayState["state"],
    )
  ) {
    throw new SyncApiError("sync.status.marketplace_replay.state is invalid");
  }
  return {
    state: raw.state as MarketplaceReplayState["state"],
    recordId: parseOptionalString(raw?.record_id, "sync.status.marketplace_replay.record_id"),
    updatedAt: parseOptionalString(raw?.updated_at, "sync.status.marketplace_replay.updated_at"),
  };
}

function parseMarketplaceReconciliationState(
  raw: RawMarketplaceReconciliationState,
): MarketplaceReconciliationState {
  return {
    totalLocal: parseNumber(raw?.total_local, "sync.status.marketplace_reconciliation.total_local"),
    totalRemote: parseNumber(raw?.total_remote, "sync.status.marketplace_reconciliation.total_remote"),
    mismatchCount: parseNumber(
      raw?.mismatch_count,
      "sync.status.marketplace_reconciliation.mismatch_count",
    ),
  };
}

function parseMarketplaceSyncEvent(raw: RawMarketplaceSyncEvent): MarketplaceSyncDLQEvent {
  if (raw?.entity_type !== "product") {
    throw new SyncApiError("marketplace.sync.event.entity_type is invalid");
  }
  if (raw?.operation !== "upsert" && raw?.operation !== "delete") {
    throw new SyncApiError("marketplace.sync.event.operation is invalid");
  }
  return {
    tenantId: parseString(raw?.tenant_id, "marketplace.sync.event.tenant_id"),
    provider: parseString(raw?.provider, "marketplace.sync.event.provider"),
    entityType: raw.entity_type,
    entityId: parseString(raw?.entity_id, "marketplace.sync.event.entity_id"),
    externalId: parseOptionalString(raw?.external_id, "marketplace.sync.event.external_id"),
    operation: raw.operation,
    version: parseString(raw?.version, "marketplace.sync.event.version"),
    payload:
      raw?.payload && typeof raw.payload === "object" && !Array.isArray(raw.payload)
        ? (raw.payload as Record<string, unknown>)
        : undefined,
  };
}

function parseMarketplaceDLQRecord(raw: RawMarketplaceDLQRecord): MarketplaceSyncDLQRecord {
  return {
    id: parseString(raw?.id, "marketplace.dlq.id"),
    event: parseMarketplaceSyncEvent(raw?.event),
    attempts: parseNumber(raw?.attempts, "marketplace.dlq.attempts"),
    reason: parseString(raw?.reason, "marketplace.dlq.reason"),
  };
}

function parseMarketplaceDLQList(raw: RawMarketplaceDLQListResponse): MarketplaceSyncDLQList {
  if (!Array.isArray(raw?.records)) {
    throw new SyncApiError("fetchMarketplaceSyncDLQ: response body must include records array");
  }
  return {
    records: raw.records.map(parseMarketplaceDLQRecord),
    total: parseNumber(raw?.total, "marketplace.dlq.total"),
  };
}

function parseWorkflowStart(raw: RawWorkflowStartResponse, recordId: string): MarketplaceDLQReplayResult {
  if (raw?.status !== "started") {
    throw new SyncApiError("marketplace.dlq.replay.status is invalid");
  }
  if (raw?.task_queue !== "ec-workflows") {
    throw new SyncApiError("marketplace.dlq.replay.task_queue is invalid");
  }
  return {
    workflowId: parseString(raw?.workflow_id, "marketplace.dlq.replay.workflow_id"),
    runId: parseString(raw?.run_id, "marketplace.dlq.replay.run_id"),
    status: raw.status,
    taskQueue: raw.task_queue,
    recordId,
  };
}

function parseStatus(raw: unknown): MarketplaceSyncStatus {
  const value = raw as RawSyncStatus;
  return {
    totalEvents: parseNumber(value?.total_events, "sync.status.total_events"),
    pendingConflicts: parseNumber(value?.pending_conflicts, "sync.status.pending_conflicts"),
    lastEvent: value?.last_event ? parseEvent(value.last_event) : undefined,
    lastError: parseOptionalString(value?.last_error, "sync.status.last_error"),
    updatedAt: parseString(value?.updated_at, "sync.status.updated_at"),
    dlqDepth: parseNumber(value?.dlq_depth, "sync.status.dlq_depth"),
    marketplaceReplay: parseMarketplaceReplayState(value?.marketplace_replay),
    marketplaceReconciliation: parseMarketplaceReconciliationState(
      value?.marketplace_reconciliation,
    ),
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

export async function fetchSyncStatus(opts: FetchSyncStatusOptions): Promise<MarketplaceSyncStatus> {
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

export async function fetchMarketplaceSyncDLQ(
  opts: FetchMarketplaceSyncDLQOptions,
): Promise<MarketplaceSyncDLQList> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(apiUrl(opts.baseUrl, "/api/v1/sync/dlq"), {
      method: "GET",
      headers: { accept: "application/json" },
      signal: opts.signal,
    });
  } catch (err) {
    throw new SyncApiError("fetchMarketplaceSyncDLQ: network error", err);
  }
  return parseMarketplaceDLQList(
    (await readJson(res, "fetchMarketplaceSyncDLQ")) as RawMarketplaceDLQListResponse,
  );
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

export async function replayMarketplaceSyncDLQ(
  opts: ReplayMarketplaceSyncDLQOptions,
): Promise<MarketplaceDLQReplayResult> {
  if (!opts.recordId) throw new SyncApiError("replayMarketplaceSyncDLQ: recordId is required");
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(
      apiUrl(opts.baseUrl, `/api/v1/sync/dlq/${encodeURIComponent(opts.recordId)}/replay`),
      {
        method: "POST",
        headers: { accept: "application/json" },
        signal: opts.signal,
      },
    );
  } catch (err) {
    throw new SyncApiError("replayMarketplaceSyncDLQ: network error", err);
  }
  return parseWorkflowStart(
    (await readJson(res, "replayMarketplaceSyncDLQ")) as RawWorkflowStartResponse,
    opts.recordId,
  );
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
