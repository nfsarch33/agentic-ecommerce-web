import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/server/auth-session", () => ({
  requireServerSession: vi.fn(async () => ({
    user: { id: "u-1", email: "ops@example.com", role: "operator" as const },
    expiresAt: "2099-01-01T00:00:00Z",
  })),
}));

const listImpl = vi.fn();
vi.mock("@/lib/usecases/list-digital-products", () => ({
  listDigitalProductsUsecase: (input: unknown) => listImpl(input),
}));

import DigitalProductsAdminPage from "./page";

describe("/admin/digital-products page", () => {
  beforeEach(() => {
    listImpl.mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders empty state when the usecase returns no products", async () => {
    listImpl.mockResolvedValueOnce({ products: [], total: 0 });
    const ui = await DigitalProductsAdminPage();
    render(ui);
    expect(screen.getByTestId("digital-products-empty")).toBeVisible();
  });

  it("propagates the error message into the empty state", async () => {
    listImpl.mockResolvedValueOnce({ products: [], total: 0, error: "HTTP 500" });
    const ui = await DigitalProductsAdminPage();
    render(ui);
    expect(screen.getByTestId("digital-products-error")).toHaveTextContent("HTTP 500");
  });
});
