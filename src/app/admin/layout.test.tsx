import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AdminLayout from "./layout";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((target: string) => {
    throw new Error(`redirect:${target}`);
  }),
}));

vi.mock("@/lib/server/auth-session", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/components/AdminShell", () => ({
  AdminShell: ({ children, user }: { children: React.ReactNode; user: { email: string } }) => (
    <div>
      <p>{user.email}</p>
      {children}
    </div>
  ),
}));

import { getServerSession } from "@/lib/server/auth-session";

const mockGetServerSession = vi.mocked(getServerSession);

describe("AdminLayout", () => {
  it("redirects anonymous users to login", async () => {
    mockGetServerSession.mockResolvedValue(null);

    await expect(AdminLayout({ children: <p>Protected</p> })).rejects.toThrow("redirect:/login?next=/admin");
  });

  it("renders protected admin content for authenticated users", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "u_1", email: "admin@example.com", role: "admin" },
      expiresAt: "2026-05-07T10:00:00Z",
    });

    render(await AdminLayout({ children: <p>Protected</p> }));

    expect(screen.getByText("admin@example.com")).toBeInTheDocument();
    expect(screen.getByText("Protected")).toBeInTheDocument();
  });
});
