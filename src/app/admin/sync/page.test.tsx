import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SyncPage from "./page";

vi.mock("@/lib/adapters/api/sync", () => ({
  fetchSyncConflicts: vi.fn(),
  fetchSyncStatus: vi.fn(),
  resolveSyncConflict: vi.fn(),
}));

vi.mock("@/components/SyncDashboard", () => ({
  SyncDashboard: ({
    initialStatus,
    initialConflicts,
  }: {
    initialStatus: { pendingConflicts: number };
    initialConflicts: unknown[];
  }) => (
    <div>
      <h1>Sync Dashboard</h1>
      <p>Pending: {initialStatus.pendingConflicts}</p>
      <p>Conflicts: {initialConflicts.length}</p>
    </div>
  ),
}));

import { fetchSyncConflicts, fetchSyncStatus } from "@/lib/adapters/api/sync";

const mockFetchSyncStatus = vi.mocked(fetchSyncStatus);
const mockFetchSyncConflicts = vi.mocked(fetchSyncConflicts);

describe("Admin sync page", () => {
  it("loads the initial sync status and conflicts", async () => {
    mockFetchSyncStatus.mockResolvedValue({
      totalEvents: 3,
      pendingConflicts: 1,
      dlqDepth: 0,
      marketplaceReplay: { state: "idle" },
      marketplaceReconciliation: {
        totalLocal: 3,
        totalRemote: 3,
        mismatchCount: 0,
      },
      updatedAt: "2026-05-07T04:31:00Z",
    });
    mockFetchSyncConflicts.mockResolvedValue([
      {
        id: "conflict_1",
        sku: "SKU-1",
        remoteId: 44,
        fields: [{ field: "title", localValue: "Foam roller", remoteValue: "Foam Roller Pro" }],
        createdAt: "2026-05-07T04:26:00Z",
        status: "pending",
      },
    ]);

    render(await SyncPage());

    expect(screen.getByRole("heading", { name: /sync dashboard/i })).toBeInTheDocument();
    expect(screen.getByText("Pending: 1")).toBeInTheDocument();
    expect(screen.getByText("Conflicts: 1")).toBeInTheDocument();
    expect(mockFetchSyncStatus).toHaveBeenCalledWith(expect.objectContaining({ baseUrl: "http://localhost:8080" }));
    expect(mockFetchSyncConflicts).toHaveBeenCalledWith(expect.objectContaining({ baseUrl: "http://localhost:8080" }));
  });
});
