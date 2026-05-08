import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/server/auth-session", () => ({
  requireServerSession: vi.fn(async () => ({
    user: { id: "u-1", email: "admin@example.com", role: "admin" as const },
    expiresAt: "2099-01-01T00:00:00Z",
  })),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import NewTenantPage from "./page";

describe("/admin/tenants/new page", () => {
  it("renders the wizard", async () => {
    const ui = await NewTenantPage();
    render(ui);
    expect(screen.getByTestId("tenant-wizard")).toBeInTheDocument();
  });
});
