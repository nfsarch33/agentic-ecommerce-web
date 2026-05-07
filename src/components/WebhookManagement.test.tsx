import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AutomationStatus, WebhookDelivery, WebhookRegistration } from "@/lib/domain/webhook";
import { WebhookManagement } from "./WebhookManagement";

const webhook: WebhookRegistration = {
  id: "wh_product_approved",
  url: "https://hooks.n8n.example/webhook/product-approved",
  eventTypes: ["product.approved"],
  description: "Notify n8n",
  secretConfigured: true,
  active: true,
  createdAt: "2026-05-08T00:00:00Z",
  updatedAt: "2026-05-08T00:01:00Z",
  lastDeliveryAt: "2026-05-08T00:02:00Z",
  failureCount: 0,
};

const automationStatuses: AutomationStatus[] = [
  {
    id: "product-approved-slack",
    name: "Product approved -> Slack notification",
    eventType: "product.approved",
    status: "active",
    description: "Posts an approval event to a Slack channel through n8n.",
    target: "n8n",
    lastDeliveryAt: "2026-05-08T00:02:00Z",
  },
  {
    id: "order-placed-email",
    name: "Order placed -> email confirmation",
    eventType: "order.placed",
    status: "not_configured",
    description: "Sends order confirmation email through n8n.",
    target: "n8n",
  },
];

const delivery: WebhookDelivery = {
  id: "del_test",
  webhookId: webhook.id,
  eventType: "product.approved",
  status: "delivered",
  responseStatus: 200,
  attempt: 1,
  occurredAt: "2026-05-08T00:03:00Z",
};

describe("WebhookManagement", () => {
  it("renders registrations and example automation status", () => {
    render(<WebhookManagement apiBaseUrl="http://api.test" webhooks={[webhook]} automationStatuses={automationStatuses} />);

    expect(screen.getByRole("heading", { level: 1, name: "Webhooks" })).toBeInTheDocument();
    expect(screen.getByText("https://hooks.n8n.example/webhook/product-approved")).toBeInTheDocument();
    expect(screen.getByText("Product approved -> Slack notification")).toBeInTheDocument();
    expect(screen.getByText("Order placed -> email confirmation")).toBeInTheDocument();
    expect(screen.getByText("Not configured")).toBeInTheDocument();
  });

  it("registers a webhook and adds it to the list", async () => {
    const user = userEvent.setup();
    const createWebhookImpl = vi.fn().mockResolvedValue(webhook);

    render(
      <WebhookManagement
        apiBaseUrl="http://api.test"
        webhooks={[]}
        automationStatuses={automationStatuses}
        createWebhookImpl={createWebhookImpl}
      />,
    );

    fireEvent.change(screen.getByLabelText(/destination url/i), {
      target: { value: " https://hooks.n8n.example/webhook/product-approved " },
    });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: " Notify n8n " } });
    fireEvent.change(screen.getByLabelText(/signing secret/i), { target: { value: " secret-value " } });
    await user.click(screen.getByLabelText(/product approved/i));
    await user.click(screen.getByRole("button", { name: /register webhook/i }));

    expect(createWebhookImpl).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: "http://api.test",
        url: " https://hooks.n8n.example/webhook/product-approved ",
        eventTypes: ["product.approved"],
        description: " Notify n8n ",
        secret: " secret-value ",
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent("Webhook registered.");
    expect(screen.getByText("https://hooks.n8n.example/webhook/product-approved")).toBeInTheDocument();
  });

  it("deletes registrations and sends optional test deliveries", async () => {
    const user = userEvent.setup();
    const deleteWebhookImpl = vi.fn().mockResolvedValue(undefined);
    const sendTestWebhookImpl = vi.fn().mockResolvedValue(delivery);

    render(
      <WebhookManagement
        apiBaseUrl="http://api.test"
        webhooks={[webhook]}
        automationStatuses={automationStatuses}
        deleteWebhookImpl={deleteWebhookImpl}
        sendTestWebhookImpl={sendTestWebhookImpl}
      />,
    );

    const card = screen.getByRole("article", { name: /notify n8n/i });
    await user.click(within(card).getByRole("button", { name: /send test/i }));
    expect(await screen.findByRole("status")).toHaveTextContent("Test delivery delivered.");

    await user.click(within(card).getByRole("button", { name: /delete/i }));
    expect(deleteWebhookImpl).toHaveBeenCalledWith({ baseUrl: "http://api.test", webhookId: webhook.id });
    expect(screen.queryByText("https://hooks.n8n.example/webhook/product-approved")).not.toBeInTheDocument();
  });

  it("shows validation errors before registering incomplete webhooks", async () => {
    const user = userEvent.setup();
    const createWebhookImpl = vi.fn();

    render(
      <WebhookManagement
        apiBaseUrl="http://api.test"
        webhooks={[]}
        automationStatuses={automationStatuses}
        createWebhookImpl={createWebhookImpl}
      />,
    );

    await user.click(screen.getByRole("button", { name: /register webhook/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/destination url is required/i);
    expect(createWebhookImpl).not.toHaveBeenCalled();
  });
});
