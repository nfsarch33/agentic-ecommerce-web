export type SyncState = "idle" | "running" | "degraded" | "failed";
export type SyncResourceType = "product" | "order" | "inventory";
export type SyncConflictStatus = "open" | "resolved";
export type SyncConflictResolution = "accept_local" | "accept_remote" | "mark_resolved";

export interface SyncStatus {
  readonly state: SyncState;
  readonly lastSyncAt?: string;
  readonly nextSyncAt?: string;
  readonly syncLagSeconds: number;
  readonly inFlightJobs: number;
  readonly queuedEvents: number;
  readonly conflictCount: number;
  readonly errorCount: number;
  readonly lastError?: string;
  readonly updatedAt: string;
}

export interface SyncConflict {
  readonly id: string;
  readonly resourceType: SyncResourceType;
  readonly resourceId: string;
  readonly field: string;
  readonly backendValue: unknown;
  readonly wooCommerceValue: unknown;
  readonly localUpdatedAt: string;
  readonly remoteUpdatedAt: string;
  readonly detectedAt: string;
  readonly status: SyncConflictStatus;
  readonly resolution?: SyncConflictResolution;
  readonly resolvedAt?: string;
}

export function isSyncHealthy(status: SyncStatus): boolean {
  return (
    (status.state === "idle" || status.state === "running") &&
    status.conflictCount === 0 &&
    status.errorCount === 0
  );
}

export function countOpenConflicts(conflicts: readonly SyncConflict[]): number {
  return conflicts.filter((conflict) => conflict.status === "open").length;
}
