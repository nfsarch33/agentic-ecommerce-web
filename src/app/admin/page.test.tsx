import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const requireServerSession = vi.fn();

vi.mock("@/lib/server/auth-session", () => ({
  requireServerSession: (...args: unknown[]) => requireServerSession(...args),
}));

vi.mock("@/components/EventActivityFeed", () => ({
  EventActivityFeed: ({ apiBaseUrl }: { readonly apiBaseUrl: string }) => (
    <div data-testid="event-feed">{apiBaseUrl}</div>
  ),
}));

import AdminHomePage from "./page";

describe("AdminHomePage", () => {
  it("greets the signed-in user and renders all admin cards visible to admins", async () => {
    requireServerSession.mockResolvedValueOnce({
      user: { id: "u_1", email: "admin@example.com", role: "admin" },
      expiresAt: "2026-05-08T00:00:00Z",
    });
    const page = await AdminHomePage();
    render(page);
    expect(
      screen.getByRole("heading", { name: "Admin Dashboard", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/admin@example.com/)).toBeInTheDocument();
    for (const [label, href] of [
      ["Products", "/admin/products"],
      ["Orders", "/admin/orders"],
      ["Agents", "/admin/agents"],
      ["Workflows", "/admin/workflows"],
      ["Settings", "/admin/settings"],
    ] as const) {
      expect(screen.getByRole("heading", { name: label, level: 2 })).toBeInTheDocument();
      const link = screen
        .getAllByRole("link")
        .find((node) => node.getAttribute("href") === href);
      expect(link).toBeDefined();
    }
  });

  it("hides Settings (admin-only) and other restricted cards from a viewer role", async () => {
    requireServerSession.mockResolvedValueOnce({
      user: { id: "u_3", email: "viewer@example.com", role: "viewer" },
      expiresAt: "2026-05-08T00:00:00Z",
    });
    const page = await AdminHomePage();
    render(page);
    expect(screen.getByRole("heading", { name: "Products", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Orders", level: 2 })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Settings", level: 2 })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Agents", level: 2 })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Workflows", level: 2 })).toBeNull();
  });

  it("forwards the public MC API base URL to EventActivityFeed", async () => {
    requireServerSession.mockResolvedValueOnce({
      user: { id: "u_1", email: "admin@example.com", role: "admin" },
      expiresAt: "2026-05-08T00:00:00Z",
    });
    const previous = process.env.NEXT_PUBLIC_MC_API_BASE_URL;
    process.env.NEXT_PUBLIC_MC_API_BASE_URL = "https://public-api.example.com";
    try {
      const page = await AdminHomePage();
      render(page);
      expect(screen.getByTestId("event-feed")).toHaveTextContent("https://public-api.example.com");
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_MC_API_BASE_URL;
      else process.env.NEXT_PUBLIC_MC_API_BASE_URL = previous;
    }
  });
});
