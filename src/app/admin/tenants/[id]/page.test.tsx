import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TenantsApiError } from "@/lib/adapters/api/tenants";

vi.mock("@/lib/server/auth-session", () => ({
  requireServerSession: vi.fn(async () => ({
    user: { id: "u-1", email: "admin@example.com", role: "admin" as const },
    expiresAt: "2099-01-01T00:00:00Z",
  })),
}));

const fetchImpl = vi.fn();
vi.mock("@/lib/adapters/api/tenants", async () => {
  const actual = await vi.importActual<typeof import("@/lib/adapters/api/tenants")>(
    "@/lib/adapters/api/tenants",
  );
  return {
    ...actual,
    fetchTenant: (input: unknown) => fetchImpl(input),
  };
});

const notFoundMock = vi.fn(() => {
  throw new Error("__notfound__");
});
vi.mock("next/navigation", () => ({
  notFound: () => notFoundMock(),
}));

import TenantDetailPage from "./page";

describe("/admin/tenants/[id] page", () => {
  beforeEach(() => {
    fetchImpl.mockReset();
    notFoundMock.mockReset().mockImplementation(() => {
      throw new Error("__notfound__");
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a single-row view for a known tenant", async () => {
    fetchImpl.mockResolvedValueOnce({
      id: "acme",
      slug: "acme",
      name: "Acme",
      plan: "free",
      status: "active",
      createdAt: "2026-05-08T10:00:00Z",
      updatedAt: "2026-05-08T10:00:00Z",
    });
    const ui = await TenantDetailPage({ params: Promise.resolve({ id: "acme" }) });
    render(ui);
    expect(screen.getByTestId("tenant-row-acme")).toBeInTheDocument();
  });

  it("calls notFound() on 404", async () => {
    fetchImpl.mockRejectedValueOnce(new TenantsApiError("not found", 404));
    await expect(
      TenantDetailPage({ params: Promise.resolve({ id: "ghost" }) }),
    ).rejects.toThrow("__notfound__");
    expect(notFoundMock).toHaveBeenCalled();
  });
});
