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
  id: "wh_product_created",
  url: "https://hooks.n8n.example/webhook/product-created",
  event_types: ["product.created", "order.placed"],
  secret_hash: "sha256:test",
  enabled: true,
  created_at: "2026-05-08T00:00:00Z",
};

const rawDelivery = {
  id: "del_test",
  webhook_id: "wh_product_created",
  event_type: "product.created",
  event_id: "evt_test",
  success: true,
  status: 204,
  attempts: 1,
  created_at: "2026-05-08T00:03:00Z",
};

describe("webhooks API adapter", () => {
  it("fetches webhook registrations and maps snake_case fields", async () => {
    const result = await fetchWebhooks({
      baseUrl: "http://api.test",
      fetchImpl: mockFetch({ webhooks: [rawWebhook] }),
    });

    expect(result[0]).toMatchObject({
      id: "wh_product_created",
      url: "https://hooks.n8n.example/webhook/product-created",
      eventTypes: ["product.created", "order.placed"],
      secretConfigured: true,
      active: true,
      createdAt: "2026-05-08T00:00:00Z",
      updatedAt: "2026-05-08T00:00:00Z",
    });
  });

  it("registers a webhook with backend OpenAPI request and response shapes", async () => {
    const fetchImpl = mockFetch(rawWebhook, 201);

    await createWebhook({
      baseUrl: "http://api.test/",
      url: "https://hooks.n8n.example/webhook/product-created",
      eventTypes: ["product.created"],
      secret: "secret-value",
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://api.test/api/v1/webhooks",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          url: "https://hooks.n8n.example/webhook/product-created",
          event_types: ["product.created"],
          secret: "secret-value",
          enabled: true,
        }),
      }),
    );
  });

  it("sends an empty secret only when callers bypass usecase validation", async () => {
    const fetchImpl = mockFetch({ ...rawWebhook, secret_hash: "" }, 201);

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
          secret: "",
          enabled: true,
        }),
      }),
    );
  });

  it("deletes and test-delivers webhooks by encoded id", async () => {
    const deleteFetch = mockFetch(null, 204);
    await deleteWebhook({
      baseUrl: "http://api.test",
      webhookId: "wh/product",
      fetchImpl: deleteFetch,
    });
    expect(deleteFetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/webhooks/wh%2Fproduct",
      expect.objectContaining({ method: "DELETE" }),
    );

    const delivery = await sendTestWebhook({
      baseUrl: "http://api.test",
      webhookId: "wh_product_created",
      eventType: "product.created",
      fetchImpl: mockFetch({ delivery: rawDelivery }, 202),
    });
    expect(delivery.status).toBe("delivered");
    expect(delivery.responseStatus).toBe(204);
  });

  it("throws WebhooksApiError for HTTP failures and invalid response bodies", async () => {
    await expect(
      fetchWebhooks({ baseUrl: "http://api.test", fetchImpl: mockFetch({}, 500) }),
    ).rejects.toThrow(WebhooksApiError);
    await expect(
      fetchWebhooks({ baseUrl: "http://api.test", fetchImpl: mockFetch({}) }),
    ).rejects.toThrow("response body must include webhooks array");
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
        webhookId: "wh_product_created",
        eventType: "product.created",
        fetchImpl: mockFetch({}, 202),
      }),
    ).rejects.toThrow("response body must include delivery");
  });
});
