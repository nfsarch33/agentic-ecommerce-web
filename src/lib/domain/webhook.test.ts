import { describe, expect, it } from "vitest";
import {
  WebhookDomainError,
  automationStatusLabel,
  automationStatusTone,
  automationStatusesFromWebhooks,
  createWebhookDelivery,
  createWebhookRegistration,
  webhookDeliveryStatusLabel,
  webhookEventTypeLabel,
  webhookStatusTone,
} from "./webhook";

const registration = {
  id: "wh_product_created",
  url: " https://hooks.n8n.example/webhook/product-created ",
  eventTypes: ["product.created", "order.placed"],
  description: " Notify n8n ",
  secretConfigured: true,
  active: true,
  createdAt: "2026-05-08T00:00:00Z",
  lastDeliveryAt: "2026-05-08T00:02:00Z",
  failureCount: 0,
} as const;

describe("webhook domain", () => {
  it("normalizes webhook registrations and labels supported events", () => {
    const webhook = createWebhookRegistration(registration);

    expect(webhook.url).toBe("https://hooks.n8n.example/webhook/product-created");
    expect(webhook.description).toBe("Notify n8n");
    expect(webhook.eventTypes).toEqual(["product.created", "order.placed"]);
    expect(webhookEventTypeLabel("product.created")).toBe("Product created");
    expect(webhookStatusTone(webhook)).toBe("green");
  });

  it("rejects blank URLs and unsupported event types", () => {
    expect(() => createWebhookRegistration({ ...registration, url: " " })).toThrow(
      WebhookDomainError,
    );
    expect(() =>
      createWebhookRegistration({ ...registration, eventTypes: ["inventory.changed" as never] }),
    ).toThrow("webhook.eventTypes contains unsupported event");
  });

  it("normalizes webhook delivery history", () => {
    expect(
      createWebhookDelivery({
        id: "del_1",
        webhookId: "wh_product_created",
        eventType: "product.created",
        status: "delivered",
        responseStatus: 200,
        attempt: 1,
        occurredAt: "2026-05-08T00:02:00Z",
      }),
    ).toEqual({
      id: "del_1",
      webhookId: "wh_product_created",
      eventType: "product.created",
      status: "delivered",
      responseStatus: 200,
      attempt: 1,
      occurredAt: "2026-05-08T00:02:00Z",
    });
    expect(webhookDeliveryStatusLabel("delivered")).toBe("Delivered");
    expect(webhookDeliveryStatusLabel("pending")).toBe("Pending");
    expect(webhookDeliveryStatusLabel("failed")).toBe("Failed");
  });

  it("derives example automation status from active webhook registrations", () => {
    const statuses = automationStatusesFromWebhooks([
      createWebhookRegistration(registration),
      createWebhookRegistration({
        ...registration,
        id: "wh_failed_order",
        eventTypes: ["order.placed"],
        active: true,
        failureCount: 3,
      }),
    ]);

    expect(statuses).toEqual([
      expect.objectContaining({
        id: "product-created-slack",
        name: "Product created -> Slack notification",
        eventType: "product.created",
        status: "active",
      }),
      expect.objectContaining({
        id: "order-placed-email",
        name: "Order placed -> email confirmation",
        eventType: "order.placed",
        status: "failing",
      }),
    ]);
  });

  it("labels event types and automation status tones", () => {
    expect(webhookEventTypeLabel("product.updated")).toBe("Product updated");
    expect(webhookEventTypeLabel("sync.completed")).toBe("Sync completed");
    expect(webhookEventTypeLabel("agent.run.completed")).toBe("Agent run completed");
    expect(webhookEventTypeLabel("compliance.checked")).toBe("Compliance checked");

    expect(automationStatusLabel("active")).toBe("Active");
    expect(automationStatusLabel("paused")).toBe("Paused");
    expect(automationStatusLabel("failing")).toBe("Failing");
    expect(automationStatusLabel("not_configured")).toBe("Not configured");
    expect(automationStatusTone("active")).toBe("green");
    expect(automationStatusTone("paused")).toBe("gray");
    expect(automationStatusTone("failing")).toBe("red");
    expect(automationStatusTone("not_configured")).toBe("amber");
  });

  it("marks example automations paused when matching webhooks are inactive", () => {
    const statuses = automationStatusesFromWebhooks([
      createWebhookRegistration({
        ...registration,
        active: false,
        eventTypes: ["product.created"],
      }),
    ]);

    expect(statuses[0]!).toEqual(expect.objectContaining({ status: "paused" }));
    expect(webhookStatusTone({ active: false, failureCount: 0 })).toBe("gray");
    expect(webhookStatusTone({ active: true, failureCount: 1 })).toBe("red");
  });
});
