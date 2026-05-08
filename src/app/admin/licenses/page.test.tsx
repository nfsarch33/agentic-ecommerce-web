import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { LicensesApiError } from "@/lib/adapters/api/licenses";

vi.mock("@/lib/server/auth-session", () => ({
  requireServerSession: vi.fn(async () => ({
    user: { id: "u-1", email: "ops@example.com", role: "operator" as const },
    expiresAt: "2099-01-01T00:00:00Z",
  })),
}));

const listImpl = vi.fn();
vi.mock("@/lib/adapters/api/licenses", async () => {
  const actual = await vi.importActual<typeof import("@/lib/adapters/api/licenses")>("@/lib/adapters/api/licenses");
  return {
    ...actual,
    listLicenses: (input: unknown) => listImpl(input),
  };
});

import LicensesAdminPage from "./page";

describe("/admin/licenses page", () => {
  beforeEach(() => {
    listImpl.mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders empty state when listLicenses returns no rows", async () => {
    listImpl.mockResolvedValueOnce({ licenses: [], total: 0, page: 1, perPage: 20 });
    const ui = await LicensesAdminPage();
    render(ui);
    expect(screen.getByTestId("licenses-empty")).toBeVisible();
  });

  it("propagates errors into the empty state", async () => {
    listImpl.mockRejectedValueOnce(new LicensesApiError("offline"));
    const ui = await LicensesAdminPage();
    render(ui);
    expect(screen.getByTestId("licenses-error")).toHaveTextContent("offline");
  });
});
