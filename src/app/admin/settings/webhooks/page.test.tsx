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
          id: "wh_product_approved",
          url: "https://hooks.n8n.example/webhook/product-approved",
          eventTypes: ["product.approved"],
          secretConfigured: true,
          active: true,
          createdAt: "2026-05-08T00:00:00Z",
          updatedAt: "2026-05-08T00:01:00Z",
        },
      ],
      automationStatuses: [
        {
          id: "product-approved-slack",
          name: "Product approved -> Slack notification",
          eventType: "product.approved",
          status: "active",
          description: "Posts an approval event to Slack through n8n.",
          target: "n8n",
        },
      ],
    });

    render(await WebhookSettingsPage());

    expect(mockRequireServerSession).toHaveBeenCalledWith("admin");
    expect(mockLoadWebhookSettings).toHaveBeenCalledWith({ baseUrl: "http://localhost:8080" });
    expect(screen.getByRole("heading", { name: /webhooks/i })).toBeInTheDocument();
    expect(screen.getByText("https://hooks.n8n.example/webhook/product-approved")).toBeInTheDocument();
    expect(screen.getByText("API: http://localhost:8080")).toBeInTheDocument();
  });
});
