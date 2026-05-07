export type SyncEventType =
  | "product_imported"
  | "product_published"
  | "inventory_reconciled"
  | "conflict_detected"
  | "sync_failed";
export type SyncConflictFieldName = "title" | "price" | "stock" | "description";
export type SyncConflictStatus = "pending" | "resolved";
export type SyncConflictResolution = "local" | "remote" | "manual";

export interface SyncEvent {
  readonly id: string;
  readonly type: SyncEventType;
  readonly productId?: string;
  readonly remoteId?: number;
  readonly message?: string;
  readonly metadata?: Record<string, string>;
  readonly createdAt: string;
}

export interface SyncStatus {
  readonly totalEvents: number;
  readonly pendingConflicts: number;
  readonly lastEvent?: SyncEvent;
  readonly lastError?: string;
  readonly updatedAt: string;
}

export interface SyncConflictField {
  readonly field: SyncConflictFieldName;
  readonly localValue: string;
  readonly remoteValue: string;
}

export interface SyncConflict {
  readonly id: string;
  readonly productId?: string;
  readonly sku: string;
  readonly remoteId: number;
  readonly status: SyncConflictStatus;
  readonly fields: readonly SyncConflictField[];
  readonly resolution?: SyncConflictResolution;
  readonly note?: string;
  readonly createdAt: string;
  readonly resolvedAt?: string;
}

export function isSyncHealthy(status: SyncStatus): boolean {
  return status.pendingConflicts === 0 && !status.lastError;
}

export function countOpenConflicts(conflicts: readonly SyncConflict[]): number {
  return conflicts.filter((conflict) => conflict.status === "pending").length;
}
