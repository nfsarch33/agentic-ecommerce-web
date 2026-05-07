import { describe, expect, it, vi } from "vitest";
import {
  fetchSyncConflicts,
  fetchSyncStatus,
  resolveSyncConflict,
  SyncApiError,
} from "./sync";

function jsonResponse(body: unknown, init: ResponseInit = { status: 200 }): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    ...init,
  });
}

const rawStatus = {
  total_events: 3,
  pending_conflicts: 1,
  last_event: {
    id: "event_1",
    type: "conflict_detected",
    product_id: "p_1",
    remote_id: 44,
    message: "manual sync conflict detected",
    created_at: "2026-05-07T04:30:00Z",
  },
  updated_at: "2026-05-07T04:31:00Z",
};

const rawConflict = {
  id: "conflict_1",
  product_id: "p_1",
  sku: "SKU-1",
  remote_id: 44,
  fields: [{ field: "price", local_value: "3500", remote_value: "3999" }],
  status: "pending",
  created_at: "2026-05-07T04:26:00Z",
};

describe("fetchSyncStatus", () => {
  it("fetches and parses the expected v0.3 sync status contract", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse(rawStatus));

    const status = await fetchSyncStatus({ baseUrl: "http://api.test", fetchImpl: mockFetch });

    expect(status.totalEvents).toBe(3);
    expect(status.pendingConflicts).toBe(1);
    expect(status.lastEvent?.type).toBe("conflict_detected");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/sync/status",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("wraps non-2xx and malformed responses", async () => {
    await expect(
      fetchSyncStatus({
        baseUrl: "http://api.test",
        fetchImpl: vi.fn().mockResolvedValue(jsonResponse({ error: "boom" }, { status: 500 })),
      }),
    ).rejects.toBeInstanceOf(SyncApiError);

    await expect(
      fetchSyncStatus({
        baseUrl: "http://api.test",
        fetchImpl: vi.fn().mockResolvedValue(jsonResponse({ total_events: -1, pending_conflicts: 0 })),
      }),
    ).rejects.toBeInstanceOf(SyncApiError);
  });
});

describe("fetchSyncConflicts", () => {
  it("fetches and parses sync conflicts", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ conflicts: [rawConflict] }));

    const conflicts = await fetchSyncConflicts({ baseUrl: "http://api.test", fetchImpl: mockFetch });

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.sku).toBe("SKU-1");
    expect(conflicts[0]?.fields[0]?.remoteValue).toBe("3999");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/sync/conflicts",
      expect.objectContaining({ method: "GET" }),
    );
  });
});

describe("resolveSyncConflict", () => {
  it("posts the selected resolution and parses the updated conflict", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      jsonResponse({
        ...rawConflict,
        resolution: "remote",
        status: "resolved",
        resolved_at: "2026-05-07T04:40:00Z",
      }),
    );

    const conflict = await resolveSyncConflict({
      baseUrl: "http://api.test",
      conflictId: "conflict_1",
      resolution: "remote",
      fetchImpl: mockFetch,
    });

    expect(conflict.status).toBe("resolved");
    expect(conflict.resolution).toBe("remote");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/sync/conflicts/conflict_1/resolve",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "content-type": "application/json" }),
        body: JSON.stringify({ resolution: "remote" }),
      }),
    );
  });
});
