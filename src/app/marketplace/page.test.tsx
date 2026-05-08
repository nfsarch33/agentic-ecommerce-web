import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

const usecase = vi.fn();
vi.mock("@/lib/usecases/list-public-marketplace", () => ({
  listPublicMarketplaceUsecase: (input: unknown) => usecase(input),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import MarketplaceStorefrontPage from "./page";

describe("/marketplace storefront page", () => {
  beforeEach(() => usecase.mockReset());
  afterEach(() => vi.restoreAllMocks());

  it("renders the catalogue when plugins load", async () => {
    usecase.mockResolvedValueOnce({
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
      categories: ["payments"],
      total: 1,
    });
    const ui = await MarketplaceStorefrontPage();
    render(ui);
    expect(screen.getByTestId("plugin-catalog-card-stripe-payments")).toBeInTheDocument();
  });

  it("renders the empty state when no plugins are listed", async () => {
    usecase.mockResolvedValueOnce({
      plugins: [],
      categories: [],
      total: 0,
    });
    const ui = await MarketplaceStorefrontPage();
    render(ui);
    expect(screen.getByTestId("marketplace-storefront-empty")).toBeInTheDocument();
  });

  it("renders the error banner when usecase fails", async () => {
    usecase.mockResolvedValueOnce({
      plugins: [],
      categories: [],
      total: 0,
      error: "HTTP 500",
    });
    const ui = await MarketplaceStorefrontPage();
    render(ui);
    expect(screen.getByTestId("marketplace-storefront-error")).toHaveTextContent("HTTP 500");
  });
});
