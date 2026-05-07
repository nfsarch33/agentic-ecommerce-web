import { describe, expect, it, vi } from "vitest";
import type { WebhookDelivery, WebhookRegistration } from "@/lib/domain/webhook";
import {
  deleteWebhookRegistration,
  loadWebhookSettings,
  registerWebhook,
  testWebhookDelivery,
} from "./webhooks";

const webhook: WebhookRegistration = {
  id: "wh_product_created",
  url: "https://hooks.n8n.example/webhook/product-created",
  eventTypes: ["product.created"],
  secretConfigured: true,
  active: true,
  createdAt: "2026-05-08T00:00:00Z",
  lastDeliveryAt: "2026-05-08T00:02:00Z",
  failureCount: 0,
};

const delivery: WebhookDelivery = {
  id: "del_test",
  webhookId: webhook.id,
  eventType: "product.created",
  status: "delivered",
  responseStatus: 200,
  attempt: 1,
  occurredAt: "2026-05-08T00:03:00Z",
};

describe("webhook usecases", () => {
  it("loads registrations and derives example automation status", async () => {
    const fetchWebhooksImpl = vi.fn().mockResolvedValue([webhook]);

    const result = await loadWebhookSettings({ baseUrl: "http://api.test" }, { fetchWebhooksImpl });

    expect(result.webhooks).toEqual([webhook]);
    expect(result.automationStatuses).toEqual([
      expect.objectContaining({ eventType: "product.created", status: "active" }),
      expect.objectContaining({ eventType: "order.placed", status: "not_configured" }),
    ]);
  });

  it("trims registration input and forwards it to the API adapter", async () => {
    const createWebhookImpl = vi.fn().mockResolvedValue(webhook);

    await registerWebhook(
      {
        baseUrl: "http://api.test",
        url: " https://hooks.n8n.example/webhook/product-created ",
        eventTypes: ["product.created"],
        secret: " secret-value ",
      },
      { createWebhookImpl },
    );

    expect(createWebhookImpl).toHaveBeenCalledWith({
      baseUrl: "http://api.test",
      url: "https://hooks.n8n.example/webhook/product-created",
      eventTypes: ["product.created"],
      secret: "secret-value",
    });
  });

  it("rejects blank URLs, missing events, and missing secrets before calling the adapter", async () => {
    const createWebhookImpl = vi.fn();

    await expect(
      registerWebhook(
        { baseUrl: "http://api.test", url: " ", eventTypes: ["product.created"], secret: "secret" },
        { createWebhookImpl },
      ),
    ).rejects.toThrow("url is required");
    await expect(
      registerWebhook(
        {
          baseUrl: "http://api.test",
          url: "https://hooks.example",
          eventTypes: [],
          secret: "secret",
        },
        { createWebhookImpl },
      ),
    ).rejects.toThrow("at least one event type is required");
    await expect(
      registerWebhook(
        {
          baseUrl: "http://api.test",
          url: "https://hooks.example",
          eventTypes: ["product.created"],
        },
        { createWebhookImpl },
      ),
    ).rejects.toThrow("signing secret is required");

    expect(createWebhookImpl).not.toHaveBeenCalled();
  });

  it("deletes registrations and sends test deliveries through the API adapter", async () => {
    const deleteWebhookImpl = vi.fn().mockResolvedValue(undefined);
    const sendTestWebhookImpl = vi.fn().mockResolvedValue(delivery);

    await deleteWebhookRegistration(
      { baseUrl: "http://api.test", webhookId: " wh_product_created " },
      { deleteWebhookImpl },
    );
    await expect(
      testWebhookDelivery(
        { baseUrl: "http://api.test", webhookId: webhook.id, eventType: "product.created" },
        { sendTestWebhookImpl },
      ),
    ).resolves.toEqual(delivery);

    expect(deleteWebhookImpl).toHaveBeenCalledWith({
      baseUrl: "http://api.test",
      webhookId: webhook.id,
    });
    expect(sendTestWebhookImpl).toHaveBeenCalledWith({
      baseUrl: "http://api.test",
      webhookId: webhook.id,
      eventType: "product.created",
    });
  });
});
