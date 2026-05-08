import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/server/auth-session", () => ({
  requireServerSession: vi.fn(async () => ({
    user: { id: "u-1", email: "admin@example.com", role: "admin" as const },
    expiresAt: "2099-01-01T00:00:00Z",
  })),
}));

const listImpl = vi.fn();
vi.mock("@/lib/usecases/list-marketplace-plugins", () => ({
  listMarketplacePluginsUsecase: (input: unknown) => listImpl(input),
}));

import MarketplaceAdminPage from "./page";

describe("/admin/marketplace page", () => {
  beforeEach(() => {
    listImpl.mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the catalogue when plugins load", async () => {
    listImpl.mockResolvedValueOnce({
      plugins: [
        {
          slug: "stripe-payments",
          name: "Stripe",
          version: "1.0.0",
          vendor: "Acme",
          eventSubscriptions: [],
          permissions: [],
          dependencies: [],
        },
      ],
      total: 1,
    });
    const ui = await MarketplaceAdminPage();
    render(ui);
    expect(screen.getByTestId("plugin-card-stripe-payments")).toBeInTheDocument();
  });

  it("renders the error banner when usecase fails", async () => {
    listImpl.mockResolvedValueOnce({ plugins: [], total: 0, error: "HTTP 500" });
    const ui = await MarketplaceAdminPage();
    render(ui);
    expect(screen.getByTestId("marketplace-error")).toHaveTextContent("HTTP 500");
  });
});
