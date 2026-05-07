import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminShell } from "./AdminShell";
import type { Role, User } from "@/lib/domain/auth";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

function user(role: Role): User {
  return { id: `u_${role}`, email: `${role}@example.com`, name: role, role };
}

describe("AdminShell", () => {
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
});
