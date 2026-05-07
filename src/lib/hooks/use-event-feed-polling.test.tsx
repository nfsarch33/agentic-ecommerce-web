import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useEventFeedPolling } from "./use-event-feed-polling";
import type { EventItem } from "@/lib/domain/event";

const sampleEvents: EventItem[] = [
  {
    id: "evt_1",
    type: "product.created",
    severity: "info",
    message: "Product created",
    occurredAt: "2026-05-07T04:00:00Z",
  },
  {
    id: "evt_2",
    type: "order.placed",
    severity: "info",
    message: "Order placed",
    occurredAt: "2026-05-07T04:01:00Z",
  },
];

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("useEventFeedPolling", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("fetches events immediately on mount", async () => {
    const listEventsImpl = vi.fn().mockResolvedValue(sampleEvents);

    const { result } = renderHook(() =>
      useEventFeedPolling({
        apiBaseUrl: "http://api.test",
        listEventsImpl,
      }),
    );

    await waitFor(() => {
      expect(result.current.events).toHaveLength(2);
    });
    expect(result.current.error).toBeNull();
    expect(listEventsImpl).toHaveBeenCalledWith({ baseUrl: "http://api.test", limit: 20 });
  });

  it("polls again after the configured interval", async () => {
    vi.useFakeTimers();
    const listEventsImpl = vi.fn().mockResolvedValue(sampleEvents);

    renderHook(() =>
      useEventFeedPolling({
        apiBaseUrl: "http://api.test",
        intervalMs: 5000,
        listEventsImpl,
      }),
    );

    await act(async () => {
      await flushPromises();
    });
    expect(listEventsImpl).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(5000);
      await flushPromises();
    });
    expect(listEventsImpl).toHaveBeenCalledTimes(2);
  });

  it("sets error state when the fetch fails", async () => {
    const listEventsImpl = vi.fn().mockRejectedValue(new Error("timeout"));

    const { result } = renderHook(() =>
      useEventFeedPolling({
        apiBaseUrl: "http://api.test",
        listEventsImpl,
      }),
    );

    await waitFor(() => {
      expect(result.current.error).toBe("timeout");
    });
    expect(result.current.events).toHaveLength(0);
  });

  it("respects custom limit parameter", async () => {
    const listEventsImpl = vi.fn().mockResolvedValue([]);

    renderHook(() =>
      useEventFeedPolling({
        apiBaseUrl: "http://api.test",
        limit: 5,
        listEventsImpl,
      }),
    );

    await waitFor(() =>
      expect(listEventsImpl).toHaveBeenCalledWith({ baseUrl: "http://api.test", limit: 5 }),
    );
  });

  it("stops polling on unmount", async () => {
    vi.useFakeTimers();
    const listEventsImpl = vi.fn().mockResolvedValue([]);

    const { unmount } = renderHook(() =>
      useEventFeedPolling({
        apiBaseUrl: "http://api.test",
        intervalMs: 3000,
        listEventsImpl,
      }),
    );

    await act(async () => {
      await flushPromises();
    });
    expect(listEventsImpl).toHaveBeenCalledTimes(1);

    act(() => {
      unmount();
    });
    await act(async () => {
      vi.advanceTimersByTime(6000);
      await flushPromises();
    });
    expect(listEventsImpl).toHaveBeenCalledTimes(1);
  });
});
