import { describe, expect, it } from "vitest";
import {
  countOpenConflicts,
  isSyncHealthy,
  type SyncConflict,
  type SyncStatus,
} from "./sync";

describe("sync domain helpers", () => {
  it("treats idle and running sync states with no errors as healthy", () => {
    const status: SyncStatus = {
      state: "running",
      lastSyncAt: "2026-05-07T04:30:00Z",
      syncLagSeconds: 12,
      inFlightJobs: 1,
      queuedEvents: 3,
      conflictCount: 0,
      errorCount: 0,
      updatedAt: "2026-05-07T04:31:00Z",
    };

    expect(isSyncHealthy(status)).toBe(true);
  });

  it("treats degraded, failed, conflicts, and errors as unhealthy", () => {
    expect(
      isSyncHealthy({
        state: "degraded",
        syncLagSeconds: 60,
        inFlightJobs: 0,
        queuedEvents: 0,
        conflictCount: 0,
        errorCount: 0,
        updatedAt: "2026-05-07T04:31:00Z",
      }),
    ).toBe(false);
    expect(
      isSyncHealthy({
        state: "idle",
        syncLagSeconds: 60,
        inFlightJobs: 0,
        queuedEvents: 0,
        conflictCount: 1,
        errorCount: 0,
        updatedAt: "2026-05-07T04:31:00Z",
      }),
    ).toBe(false);
  });

  it("counts only open conflicts", () => {
    const conflicts: SyncConflict[] = [
      {
        id: "conflict_1",
        resourceType: "product",
        resourceId: "p_1",
        field: "price.amount",
        backendValue: 3500,
        wooCommerceValue: 3999,
        localUpdatedAt: "2026-05-07T04:20:00Z",
        remoteUpdatedAt: "2026-05-07T04:25:00Z",
        detectedAt: "2026-05-07T04:26:00Z",
        status: "open",
      },
      {
        id: "conflict_2",
        resourceType: "inventory",
        resourceId: "p_2",
        field: "stock",
        backendValue: 4,
        wooCommerceValue: 5,
        localUpdatedAt: "2026-05-07T04:20:00Z",
        remoteUpdatedAt: "2026-05-07T04:25:00Z",
        detectedAt: "2026-05-07T04:26:00Z",
        status: "resolved",
      },
    ];

    expect(countOpenConflicts(conflicts)).toBe(1);
  });
});
