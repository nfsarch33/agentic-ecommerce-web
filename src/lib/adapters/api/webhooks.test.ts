import { describe, expect, it, vi } from "vitest";
import {
  WebhooksApiError,
  createWebhook,
  deleteWebhook,
  fetchWebhooks,
  sendTestWebhook,
} from "./webhooks";

function mockFetch(body: unknown, status = 200): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

const rawWebhook = {
  id: "wh_product_approved",
  url: "https://hooks.n8n.example/webhook/product-approved",
  event_types: ["product.approved", "order.placed"],
  description: "Notify n8n",
  secret_configured: true,
  active: true,
  created_at: "2026-05-08T00:00:00Z",
  updated_at: "2026-05-08T00:01:00Z",
  last_delivery_at: "2026-05-08T00:02:00Z",
  failure_count: 0,
};

const rawDelivery = {
  id: "del_test",
  webhook_id: "wh_product_approved",
  event_type: "product.approved",
  status: "delivered",
  response_status: 200,
  attempt: 1,
  occurred_at: "2026-05-08T00:03:00Z",
};

describe("webhooks API adapter", () => {
  it("fetches webhook registrations and maps snake_case fields", async () => {
    const result = await fetchWebhooks({
      baseUrl: "http://api.test",
      fetchImpl: mockFetch({ webhooks: [rawWebhook] }),
    });

    expect(result).toEqual([
      {
        id: "wh_product_approved",
        url: "https://hooks.n8n.example/webhook/product-approved",
        eventTypes: ["product.approved", "order.placed"],
        description: "Notify n8n",
        secretConfigured: true,
        active: true,
        createdAt: "2026-05-08T00:00:00Z",
        updatedAt: "2026-05-08T00:01:00Z",
        lastDeliveryAt: "2026-05-08T00:02:00Z",
        failureCount: 0,
      },
    ]);
  });

  it("registers a webhook with event types and optional signing secret", async () => {
    const fetchImpl = mockFetch({ webhook: rawWebhook }, 201);

    await createWebhook({
      baseUrl: "http://api.test/",
      url: "https://hooks.n8n.example/webhook/product-approved",
      eventTypes: ["product.approved"],
      description: "Notify n8n",
      secret: "secret-value",
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://api.test/api/v1/webhooks",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          url: "https://hooks.n8n.example/webhook/product-approved",
          event_types: ["product.approved"],
          description: "Notify n8n",
          secret: "secret-value",
        }),
      }),
    );
  });

  it("omits optional registration fields when they are blank", async () => {
    const fetchImpl = mockFetch({ webhook: { ...rawWebhook, description: undefined, secret_configured: false } }, 201);

    await createWebhook({
      baseUrl: "http://api.test",
      url: "https://hooks.n8n.example/webhook/order-placed",
      eventTypes: ["order.placed"],
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://api.test/api/v1/webhooks",
      expect.objectContaining({
        body: JSON.stringify({
          url: "https://hooks.n8n.example/webhook/order-placed",
          event_types: ["order.placed"],
        }),
      }),
    );
  });

  it("deletes and test-delivers webhooks by encoded id", async () => {
    const deleteFetch = mockFetch(null, 204);
    await deleteWebhook({ baseUrl: "http://api.test", webhookId: "wh/product", fetchImpl: deleteFetch });
    expect(deleteFetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/webhooks/wh%2Fproduct",
      expect.objectContaining({ method: "DELETE" }),
    );

    const delivery = await sendTestWebhook({
      baseUrl: "http://api.test",
      webhookId: "wh_product_approved",
      eventType: "product.approved",
      fetchImpl: mockFetch({ delivery: rawDelivery }, 202),
    });
    expect(delivery.status).toBe("delivered");
  });

  it("throws WebhooksApiError for HTTP failures and invalid response bodies", async () => {
    await expect(fetchWebhooks({ baseUrl: "http://api.test", fetchImpl: mockFetch({}, 500) })).rejects.toThrow(
      WebhooksApiError,
    );
    await expect(fetchWebhooks({ baseUrl: "http://api.test", fetchImpl: mockFetch({}) })).rejects.toThrow(
      "response body must include webhooks array",
    );
    await expect(
      createWebhook({ baseUrl: "", url: "https://hooks.example", eventTypes: ["order.placed"] }),
    ).rejects.toThrow("network error");
    await expect(
      createWebhook({
        baseUrl: "http://api.test",
        url: "https://hooks.example",
        eventTypes: ["order.placed"],
        fetchImpl: vi.fn().mockRejectedValue(new Error("offline")),
      }),
    ).rejects.toThrow("network error");
    await expect(
      sendTestWebhook({
        baseUrl: "http://api.test",
        webhookId: "wh_product_approved",
        eventType: "product.approved",
        fetchImpl: mockFetch({}, 202),
      }),
    ).rejects.toThrow("response body must include delivery");
  });
});
