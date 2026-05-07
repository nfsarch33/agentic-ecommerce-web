import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSyncStatusPolling } from "./use-sync-status-polling";
import type { SyncStatus } from "@/lib/domain/sync";

const initialStatus: SyncStatus = {
  state: "idle",
  syncLagSeconds: 0,
  inFlightJobs: 0,
  queuedEvents: 0,
  conflictCount: 0,
  errorCount: 0,
  updatedAt: "2026-05-07T04:30:00Z",
};

const nextStatus: SyncStatus = {
  ...initialStatus,
  state: "running",
  inFlightJobs: 1,
  queuedEvents: 2,
  updatedAt: "2026-05-07T04:31:00Z",
};

describe("useSyncStatusPolling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with the provided status and polls for transitions", async () => {
    const fetchStatusImpl = vi.fn().mockResolvedValue(nextStatus);

    const { result } = renderHook(() =>
      useSyncStatusPolling({
        apiBaseUrl: "http://api.test",
        initialStatus,
        intervalMs: 1000,
        fetchStatusImpl,
      }),
    );

    expect(result.current.status.state).toBe("idle");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(fetchStatusImpl).toHaveBeenCalledWith(expect.objectContaining({ baseUrl: "http://api.test" }));
    expect(result.current.status.state).toBe("running");
    expect(result.current.error).toBeNull();
  });

  it("keeps the last known status when polling fails", async () => {
    const fetchStatusImpl = vi.fn().mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() =>
      useSyncStatusPolling({
        apiBaseUrl: "http://api.test",
        initialStatus,
        intervalMs: 1000,
        fetchStatusImpl,
      }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(result.current.status.state).toBe("idle");
    expect(result.current.error).toBe("network down");
  });
});
