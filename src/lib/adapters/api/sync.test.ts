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
  state: "running",
  last_sync_at: "2026-05-07T04:30:00Z",
  next_sync_at: "2026-05-07T04:35:00Z",
  sync_lag_seconds: 18,
  in_flight_jobs: 2,
  queued_events: 7,
  conflict_count: 1,
  error_count: 0,
  updated_at: "2026-05-07T04:31:00Z",
};

const rawConflict = {
  id: "conflict_1",
  resource_type: "product",
  resource_id: "p_1",
  field: "price.amount",
  backend_value: 3500,
  woocommerce_value: 3999,
  local_updated_at: "2026-05-07T04:20:00Z",
  remote_updated_at: "2026-05-07T04:25:00Z",
  detected_at: "2026-05-07T04:26:00Z",
  status: "open",
};

describe("fetchSyncStatus", () => {
  it("fetches and parses the expected v0.3 sync status contract", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse(rawStatus));

    const status = await fetchSyncStatus({ baseUrl: "http://api.test", fetchImpl: mockFetch });

    expect(status.state).toBe("running");
    expect(status.syncLagSeconds).toBe(18);
    expect(status.conflictCount).toBe(1);
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
        fetchImpl: vi.fn().mockResolvedValue(jsonResponse({ state: "unknown" })),
      }),
    ).rejects.toBeInstanceOf(SyncApiError);
  });
});

describe("fetchSyncConflicts", () => {
  it("fetches and parses sync conflicts", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ conflicts: [rawConflict] }));

    const conflicts = await fetchSyncConflicts({ baseUrl: "http://api.test", fetchImpl: mockFetch });

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.backendValue).toBe(3500);
    expect(conflicts[0]?.wooCommerceValue).toBe(3999);
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
        conflict: {
          ...rawConflict,
          resolution: "accept_remote",
          status: "resolved",
          resolved_at: "2026-05-07T04:40:00Z",
        },
      }),
    );

    const conflict = await resolveSyncConflict({
      baseUrl: "http://api.test",
      conflictId: "conflict_1",
      resolution: "accept_remote",
      fetchImpl: mockFetch,
    });

    expect(conflict.status).toBe("resolved");
    expect(conflict.resolution).toBe("accept_remote");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/sync/conflicts/conflict_1/resolve",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "content-type": "application/json" }),
        body: JSON.stringify({ resolution: "accept_remote" }),
      }),
    );
  });
});
