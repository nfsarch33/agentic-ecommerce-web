import { describe, expect, it, vi } from "vitest";
import { listRecentEvents } from "./events";
import type { EventItem } from "@/lib/domain/event";

const sampleEvent: EventItem = {
  id: "evt_1",
  type: "product.created",
  severity: "info",
  message: "Product created",
  occurredAt: "2026-05-07T04:00:00Z",
};

describe("listRecentEvents", () => {
  it("delegates to fetchRecentEvents with correct options", async () => {
    const fetchRecentEventsImpl = vi.fn().mockResolvedValue([sampleEvent]);

    const result = await listRecentEvents(
      { baseUrl: "http://api.test", limit: 10 },
      { fetchRecentEventsImpl },
    );

    expect(fetchRecentEventsImpl).toHaveBeenCalledWith({
      baseUrl: "http://api.test",
      limit: 10,
    });
    expect(result).toEqual([sampleEvent]);
  });

  it("defaults limit to undefined when not provided", async () => {
    const fetchRecentEventsImpl = vi.fn().mockResolvedValue([]);

    await listRecentEvents({ baseUrl: "http://api.test" }, { fetchRecentEventsImpl });

    expect(fetchRecentEventsImpl).toHaveBeenCalledWith({
      baseUrl: "http://api.test",
      limit: undefined,
    });
  });

  it("propagates errors from the adapter", async () => {
    const fetchRecentEventsImpl = vi.fn().mockRejectedValue(new Error("network error"));

    await expect(
      listRecentEvents({ baseUrl: "http://api.test" }, { fetchRecentEventsImpl }),
    ).rejects.toThrow("network error");
  });
});
