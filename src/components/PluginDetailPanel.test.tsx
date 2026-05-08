import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PluginDetailPanel } from "./PluginDetailPanel";

const manifest = {
  slug: "stripe-payments",
  name: "Stripe",
  version: "1.0.0",
  vendor: "Acme",
  description: "Gateway",
  category: "payments",
  eventSubscriptions: [],
  permissions: ["orders.read"],
  dependencies: [{ slug: "ses-email", constraint: "^1.0.0" }],
} as const;

afterEach(() => {
  vi.restoreAllMocks();
});

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json" } });
}

describe("PluginDetailPanel", () => {
  it("renders manifest details + install button when no installation", () => {
    render(<PluginDetailPanel manifest={manifest} baseUrl="http://x" tenantId="t" />);
    expect(screen.getByTestId(`plugin-detail-${manifest.slug}`)).toBeInTheDocument();
    expect(screen.getByTestId(`plugin-action-install-${manifest.slug}`)).toBeInTheDocument();
    expect(screen.getByText("orders.read")).toBeInTheDocument();
    expect(screen.getByText(/ses-email/)).toBeInTheDocument();
  });

  it("install -> shows installation pill", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(
        {
          tenant_id: "t",
          slug: manifest.slug,
          installed_version: "1.0.0",
          state: "installed",
          installed_at: "2026-05-08T10:00:00Z",
          updated_at: "2026-05-08T10:00:00Z",
        },
        201,
      ),
    );
    const user = userEvent.setup();
    render(<PluginDetailPanel manifest={manifest} baseUrl="http://x" tenantId="t" />);
    await user.click(screen.getByTestId(`plugin-action-install-${manifest.slug}`));
    await waitFor(() => {
      expect(screen.getByTestId("installation-status-installed")).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalled();
  });

  it("activate -> deactivate -> uninstall runs the lifecycle UI", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const initial = {
      tenantId: "t",
      slug: manifest.slug,
      installedVersion: "1.0.0",
      state: "installed" as const,
      installedAt: "2026-05-08T10:00:00Z",
      updatedAt: "2026-05-08T10:00:00Z",
    };
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          tenant_id: "t",
          slug: manifest.slug,
          installed_version: "1.0.0",
          state: "active",
          installed_at: "2026-05-08T10:00:00Z",
          updated_at: "2026-05-08T10:01:00Z",
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          tenant_id: "t",
          slug: manifest.slug,
          installed_version: "1.0.0",
          state: "deactivated",
          installed_at: "2026-05-08T10:00:00Z",
          updated_at: "2026-05-08T10:02:00Z",
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const user = userEvent.setup();
    render(<PluginDetailPanel manifest={manifest} initialInstallation={initial} baseUrl="http://x" tenantId="t" />);
    await act(async () => {
      await user.click(screen.getByTestId(`plugin-action-activate-${manifest.slug}`));
    });
    await waitFor(() => expect(screen.getByTestId("installation-status-active")).toBeInTheDocument());
    await act(async () => {
      await user.click(screen.getByTestId(`plugin-action-deactivate-${manifest.slug}`));
    });
    await waitFor(() => expect(screen.getByTestId("installation-status-deactivated")).toBeInTheDocument());
    await act(async () => {
      await user.click(screen.getByTestId(`plugin-action-uninstall-${manifest.slug}`));
    });
    await waitFor(() =>
      expect(screen.getByTestId(`plugin-action-install-${manifest.slug}`)).toBeInTheDocument(),
    );
  });

  it("surfaces backend errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("nope", { status: 409 }));
    const user = userEvent.setup();
    render(<PluginDetailPanel manifest={manifest} baseUrl="http://x" tenantId="t" />);
    await user.click(screen.getByTestId(`plugin-action-install-${manifest.slug}`));
    await waitFor(() => expect(screen.getByTestId("plugin-detail-error")).toBeInTheDocument());
  });
});
