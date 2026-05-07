import { describe, expect, it, vi } from "vitest";
import { EventsApiError, fetchRecentEvents } from "./events";

function mockFetch(body: unknown, status = 200): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

const validEvent = {
  id: "evt_1",
  type: "product.created",
  severity: "info",
  message: "Product created: Widget",
  occurred_at: "2026-05-07T04:00:00Z",
  metadata: { sku: "W-100" },
};

describe("fetchRecentEvents", () => {
  it("parses a valid events response", async () => {
    const result = await fetchRecentEvents({
      baseUrl: "http://api.test",
      fetchImpl: mockFetch({ events: [validEvent] }),
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "evt_1",
      type: "product.created",
      severity: "info",
      message: "Product created: Widget",
      occurredAt: "2026-05-07T04:00:00Z",
      metadata: { sku: "W-100" },
    });
  });

  it("appends limit query parameter with default 20", async () => {
    const fetchImpl = mockFetch({ events: [] });
    await fetchRecentEvents({ baseUrl: "http://api.test", fetchImpl });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://api.test/api/v1/events/recent?limit=20",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("respects a custom limit", async () => {
    const fetchImpl = mockFetch({ events: [] });
    await fetchRecentEvents({ baseUrl: "http://api.test", limit: 5, fetchImpl });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://api.test/api/v1/events/recent?limit=5",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("throws EventsApiError on non-OK HTTP response", async () => {
    await expect(
      fetchRecentEvents({ baseUrl: "http://api.test", fetchImpl: mockFetch({}, 500) }),
    ).rejects.toThrow(EventsApiError);
  });

  it("throws EventsApiError on network error", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("network failure"));
    await expect(
      fetchRecentEvents({ baseUrl: "http://api.test", fetchImpl }),
    ).rejects.toThrow(EventsApiError);
  });

  it("throws EventsApiError when response body has no events array", async () => {
    await expect(
      fetchRecentEvents({ baseUrl: "http://api.test", fetchImpl: mockFetch({}) }),
    ).rejects.toThrow("response body must include events array");
  });

  it("throws EventsApiError on invalid event type", async () => {
    await expect(
      fetchRecentEvents({
        baseUrl: "http://api.test",
        fetchImpl: mockFetch({ events: [{ ...validEvent, type: "unknown.type" }] }),
      }),
    ).rejects.toThrow("event.type is invalid");
  });

  it("throws EventsApiError on empty baseUrl", async () => {
    await expect(
      fetchRecentEvents({ baseUrl: "", fetchImpl: mockFetch({ events: [] }) }),
    ).rejects.toThrow("baseUrl is required");
  });

  it("handles events without metadata", async () => {
    const noMeta = { ...validEvent, metadata: undefined };
    const result = await fetchRecentEvents({
      baseUrl: "http://api.test",
      fetchImpl: mockFetch({ events: [noMeta] }),
    });
    expect(result[0]?.metadata).toBeUndefined();
  });
});
