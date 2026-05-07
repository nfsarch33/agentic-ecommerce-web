import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SettingsPage from "./page";

vi.mock("@/lib/server/auth-session", () => ({
  requireServerSession: vi.fn(),
}));

import { requireServerSession } from "@/lib/server/auth-session";

const mockRequireServerSession = vi.mocked(requireServerSession);

describe("Admin settings page", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders only non-secret configuration status for admins", async () => {
    mockRequireServerSession.mockResolvedValue({
      user: { id: "u_1", email: "admin@example.com", role: "admin" },
      expiresAt: "2026-05-07T10:00:00Z",
    });

    render(await SettingsPage());

    expect(screen.getByRole("heading", { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByText("API")).toBeInTheDocument();
    expect(screen.getByText("WooCommerce")).toBeInTheDocument();
    expect(screen.getByText("Agents")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open tenant settings/i })).toHaveAttribute(
      "href",
      "/admin/settings/tenant",
    );
    expect(screen.queryByText(/api key/i)).not.toBeInTheDocument();
  });

  it("marks configured sections when non-secret readiness env vars are present", async () => {
    vi.stubEnv("MC_API_BASE_URL", "http://api.test");
    vi.stubEnv("WOOCOMMERCE_CONFIGURED", "true");
    vi.stubEnv("AGENT_SCHEDULER_CONFIGURED", "true");
    mockRequireServerSession.mockResolvedValue({
      user: { id: "u_1", email: "admin@example.com", role: "admin" },
      expiresAt: "2026-05-07T10:00:00Z",
    });

    render(await SettingsPage());

    expect(screen.getAllByText("Configured")).toHaveLength(4);
  });
});
