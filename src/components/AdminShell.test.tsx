import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminShell } from "./AdminShell";
import type { Role, User } from "@/lib/domain/auth";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

function user(role: Role): User {
  return { id: `u_${role}`, email: `${role}@example.com`, name: role, role };
}

describe("AdminShell", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("shows all admin navigation for administrators", () => {
    render(
      <AdminShell user={user("admin")}>
        <p>Dashboard content</p>
      </AdminShell>,
    );

    expect(screen.getByRole("link", { name: /products/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /media/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /orders/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByText("admin@example.com")).toBeInTheDocument();
  });

  it("hides admin-only and operator-only navigation from viewers", () => {
    render(
      <AdminShell user={user("viewer")}>
        <p>Dashboard content</p>
      </AdminShell>,
    );

    expect(screen.getByRole("link", { name: /products/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /settings/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /agents/i })).not.toBeInTheDocument();
    expect(screen.getByText(/viewer access/i)).toBeInTheDocument();
  });

  it("shows the n8n admin link only when configured for administrators", () => {
    vi.stubEnv("NEXT_PUBLIC_N8N_URL", "https://n8n.example.com");

    const { rerender } = render(
      <AdminShell user={user("admin")}>
        <p>Dashboard content</p>
      </AdminShell>,
    );

    expect(screen.getByRole("link", { name: /open n8n/i })).toHaveAttribute("href", "https://n8n.example.com");

    rerender(
      <AdminShell user={user("operator")}>
        <p>Dashboard content</p>
      </AdminShell>,
    );
    expect(screen.queryByRole("link", { name: /open n8n/i })).not.toBeInTheDocument();
  });

  it("shows the Temporal UI link only when configured for administrators", () => {
    vi.stubEnv("NEXT_PUBLIC_TEMPORAL_UI_URL", "https://temporal.example.com");

    const { rerender } = render(
      <AdminShell user={user("admin")}>
        <p>Dashboard content</p>
      </AdminShell>,
    );

    expect(screen.getByRole("link", { name: /open temporal/i })).toHaveAttribute(
      "href",
      "https://temporal.example.com",
    );

    rerender(
      <AdminShell user={user("operator")}>
        <p>Dashboard content</p>
      </AdminShell>,
    );
    expect(screen.queryByRole("link", { name: /open temporal/i })).not.toBeInTheDocument();
  });

  it("hides the n8n admin link when no URL is configured", () => {
    render(
      <AdminShell user={user("admin")}>
        <p>Dashboard content</p>
      </AdminShell>,
    );

    expect(screen.queryByRole("link", { name: /open n8n/i })).not.toBeInTheDocument();
  });
});
