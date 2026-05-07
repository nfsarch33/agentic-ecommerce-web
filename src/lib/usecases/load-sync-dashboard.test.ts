import { describe, expect, it, vi } from "vitest";
import { loadSyncDashboard } from "./load-sync-dashboard";
import type { SyncStatus } from "@/lib/domain/sync";

const status: SyncStatus = {
  totalEvents: 0,
  pendingConflicts: 0,
  updatedAt: "2026-05-07T04:31:00Z",
};

describe("loadSyncDashboard", () => {
  it("loads status and conflicts with the same API base URL", async () => {
    const fetchStatusImpl = vi.fn().mockResolvedValue(status);
    const fetchConflictsImpl = vi.fn().mockResolvedValue([]);

    const result = await loadSyncDashboard(
      { baseUrl: "http://api.test" },
      { fetchStatusImpl, fetchConflictsImpl },
    );

    expect(result.status).toBe(status);
    expect(result.conflicts).toEqual([]);
    expect(fetchStatusImpl).toHaveBeenCalledWith({ baseUrl: "http://api.test" });
    expect(fetchConflictsImpl).toHaveBeenCalledWith({ baseUrl: "http://api.test" });
  });
});
