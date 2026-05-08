import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/server/auth-session", () => ({
  requireServerSession: vi.fn(async () => ({
    user: { id: "u-1", email: "admin@example.com", role: "admin" as const },
    expiresAt: "2099-01-01T00:00:00Z",
  })),
}));

const listImpl = vi.fn();
vi.mock("@/lib/usecases/provision-tenant", async () => {
  const actual = await vi.importActual<typeof import("@/lib/usecases/provision-tenant")>(
    "@/lib/usecases/provision-tenant",
  );
  return {
    ...actual,
    listTenantsUsecase: (input: unknown) => listImpl(input),
  };
});

import TenantsAdminPage from "./page";

describe("/admin/tenants page", () => {
  beforeEach(() => {
    listImpl.mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders empty state when no tenants exist", async () => {
    listImpl.mockResolvedValueOnce({ tenants: [], total: 0 });
    const ui = await TenantsAdminPage();
    render(ui);
    expect(screen.getByTestId("tenants-empty")).toBeInTheDocument();
  });

  it("renders the row when tenants exist", async () => {
    listImpl.mockResolvedValueOnce({
      tenants: [
        {
          id: "acme",
          slug: "acme",
          name: "Acme",
          plan: "free",
          status: "active",
          createdAt: "2026-05-08T10:00:00Z",
          updatedAt: "2026-05-08T10:00:00Z",
        },
      ],
      total: 1,
    });
    const ui = await TenantsAdminPage();
    render(ui);
    expect(screen.getByTestId("tenant-row-acme")).toBeInTheDocument();
  });
});
