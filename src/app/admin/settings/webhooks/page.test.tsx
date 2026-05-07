import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import WebhookSettingsPage from "./page";

vi.mock("@/lib/server/auth-session", () => ({
  requireServerSession: vi.fn(),
}));

vi.mock("@/lib/usecases/webhooks", () => ({
  loadWebhookSettings: vi.fn(),
}));

vi.mock("@/components/WebhookManagement", () => ({
  WebhookManagement: ({
    apiBaseUrl,
    webhooks,
  }: {
    apiBaseUrl: string;
    webhooks: Array<{ id: string; url: string }>;
  }) => (
    <div>
      <h1>Webhooks</h1>
      <p>API: {apiBaseUrl}</p>
      {webhooks.map((webhook) => (
        <p key={webhook.id}>{webhook.url}</p>
      ))}
    </div>
  ),
}));

import { requireServerSession } from "@/lib/server/auth-session";
import { loadWebhookSettings } from "@/lib/usecases/webhooks";

const mockRequireServerSession = vi.mocked(requireServerSession);
const mockLoadWebhookSettings = vi.mocked(loadWebhookSettings);

describe("admin webhook settings page", () => {
  it("requires admin access and renders webhook management with backend data", async () => {
    mockRequireServerSession.mockResolvedValue({
      user: { id: "u_1", email: "admin@example.com", role: "admin" },
      expiresAt: "2026-05-08T10:00:00Z",
    });
    mockLoadWebhookSettings.mockResolvedValue({
      webhooks: [
        {
          id: "wh_product_created",
          url: "https://hooks.n8n.example/webhook/product-created",
          eventTypes: ["product.created"],
          secretConfigured: true,
          active: true,
          createdAt: "2026-05-08T00:00:00Z",
        },
      ],
      automationStatuses: [
        {
          id: "product-created-slack",
          name: "Product created -> Slack notification",
          eventType: "product.created",
          status: "active",
          description: "Posts a product event to Slack through n8n.",
          target: "n8n",
        },
      ],
    });

    render(await WebhookSettingsPage());

    expect(mockRequireServerSession).toHaveBeenCalledWith("admin");
    expect(mockLoadWebhookSettings).toHaveBeenCalledWith({ baseUrl: "http://localhost:8080" });
    expect(screen.getByRole("heading", { name: /webhooks/i })).toBeInTheDocument();
    expect(
      screen.getByText("https://hooks.n8n.example/webhook/product-created"),
    ).toBeInTheDocument();
    expect(screen.getByText("API: http://localhost:8080")).toBeInTheDocument();
  });
});
