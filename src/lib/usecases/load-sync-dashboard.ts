import { fetchSyncConflicts, fetchSyncStatus } from "@/lib/adapters/api/sync";
import type { SyncConflict, SyncStatus } from "@/lib/domain/sync";

export interface LoadSyncDashboardInput {
  readonly baseUrl: string;
}

export interface LoadSyncDashboardResult {
  readonly status: SyncStatus;
  readonly conflicts: readonly SyncConflict[];
}

export interface LoadSyncDashboardDeps {
  readonly fetchStatusImpl?: (opts: { readonly baseUrl: string }) => Promise<SyncStatus>;
  readonly fetchConflictsImpl?: (opts: { readonly baseUrl: string }) => Promise<readonly SyncConflict[]>;
}

export async function loadSyncDashboard(
  input: LoadSyncDashboardInput,
  deps: LoadSyncDashboardDeps = {},
): Promise<LoadSyncDashboardResult> {
  const fetchStatusImpl = deps.fetchStatusImpl ?? fetchSyncStatus;
  const fetchConflictsImpl = deps.fetchConflictsImpl ?? fetchSyncConflicts;
  const [status, conflicts] = await Promise.all([
    fetchStatusImpl({ baseUrl: input.baseUrl }),
    fetchConflictsImpl({ baseUrl: input.baseUrl }),
  ]);
  return { status, conflicts };
}
