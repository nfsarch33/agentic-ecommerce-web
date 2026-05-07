import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SyncPage from "./page";

vi.mock("@/lib/adapters/api/sync", () => ({
  fetchSyncConflicts: vi.fn(),
  fetchSyncStatus: vi.fn(),
  resolveSyncConflict: vi.fn(),
}));

vi.mock("@/components/SyncDashboard", () => ({
  SyncDashboard: ({ initialStatus, initialConflicts }: { initialStatus: { state: string }; initialConflicts: unknown[] }) => (
    <div>
      <h1>Sync Dashboard</h1>
      <p>Status: {initialStatus.state}</p>
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
      state: "running",
      syncLagSeconds: 5,
      inFlightJobs: 1,
      queuedEvents: 0,
      conflictCount: 1,
      errorCount: 0,
      updatedAt: "2026-05-07T04:31:00Z",
    });
    mockFetchSyncConflicts.mockResolvedValue([
      {
        id: "conflict_1",
        resourceType: "product",
        resourceId: "p_1",
        field: "title",
        backendValue: "Foam roller",
        wooCommerceValue: "Foam Roller Pro",
        localUpdatedAt: "2026-05-07T04:20:00Z",
        remoteUpdatedAt: "2026-05-07T04:25:00Z",
        detectedAt: "2026-05-07T04:26:00Z",
        status: "open",
      },
    ]);

    render(await SyncPage());

    expect(screen.getByRole("heading", { name: /sync dashboard/i })).toBeInTheDocument();
    expect(screen.getByText("Status: running")).toBeInTheDocument();
    expect(screen.getByText("Conflicts: 1")).toBeInTheDocument();
    expect(mockFetchSyncStatus).toHaveBeenCalledWith(expect.objectContaining({ baseUrl: "http://localhost:8080" }));
    expect(mockFetchSyncConflicts).toHaveBeenCalledWith(expect.objectContaining({ baseUrl: "http://localhost:8080" }));
  });
});
