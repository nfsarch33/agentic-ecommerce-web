import { describe, expect, it } from "vitest";
import {
  countOpenConflicts,
  isSyncHealthy,
  type SyncConflict,
  type SyncStatus,
} from "./sync";

describe("sync domain helpers", () => {
  it("treats zero pending conflicts and no last error as healthy", () => {
    const status: SyncStatus = {
      totalEvents: 3,
      pendingConflicts: 0,
      updatedAt: "2026-05-07T04:31:00Z",
    };

    expect(isSyncHealthy(status)).toBe(true);
  });

  it("treats pending conflicts and last errors as unhealthy", () => {
    expect(
      isSyncHealthy({
        totalEvents: 3,
        pendingConflicts: 1,
        updatedAt: "2026-05-07T04:31:00Z",
      }),
    ).toBe(false);
    expect(
      isSyncHealthy({
        totalEvents: 3,
        pendingConflicts: 0,
        lastError: "woocommerce unavailable",
        updatedAt: "2026-05-07T04:31:00Z",
      }),
    ).toBe(false);
  });

  it("counts only open conflicts", () => {
    const conflicts: SyncConflict[] = [
      {
        id: "conflict_1",
        sku: "SKU-1",
        remoteId: 11,
        status: "pending",
        fields: [{ field: "price", localValue: "3500", remoteValue: "3999" }],
        createdAt: "2026-05-07T04:26:00Z",
      },
      {
        id: "conflict_2",
        sku: "SKU-2",
        remoteId: 12,
        status: "resolved",
        fields: [{ field: "stock", localValue: "4", remoteValue: "5" }],
        createdAt: "2026-05-07T04:26:00Z",
      },
    ];

    expect(countOpenConflicts(conflicts)).toBe(1);
  });
});
