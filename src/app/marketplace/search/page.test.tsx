import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

const usecase = vi.fn();
vi.mock("@/lib/usecases/list-public-marketplace", () => ({
  listPublicMarketplaceUsecase: (input: unknown) => usecase(input),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import MarketplaceSearchPage from "./page";

describe("/marketplace/search page", () => {
  beforeEach(() => usecase.mockReset());
  afterEach(() => vi.restoreAllMocks());

  it("renders the empty-query prompt when q is missing", async () => {
    const ui = await MarketplaceSearchPage({ searchParams: Promise.resolve({}) });
    render(ui);
    expect(screen.getByTestId("marketplace-search-empty-query")).toBeInTheDocument();
    expect(usecase).not.toHaveBeenCalled();
  });

  it("renders matching plugins for a non-empty query", async () => {
    usecase.mockResolvedValueOnce({
      plugins: [
        {
          slug: "stripe-payments",
          name: "Stripe Payments",
          version: "1.0.0",
          vendor: "Acme",
          eventSubscriptions: [],
          permissions: [],
          dependencies: [],
        },
      ],
      categories: [],
      total: 1,
    });
    const ui = await MarketplaceSearchPage({ searchParams: Promise.resolve({ q: "stripe" }) });
    render(ui);
    expect(screen.getByTestId("plugin-catalog-card-stripe-payments")).toBeInTheDocument();
  });

  it("renders the no-results state when the query matches nothing", async () => {
    usecase.mockResolvedValueOnce({
      plugins: [],
      categories: [],
      total: 0,
    });
    const ui = await MarketplaceSearchPage({ searchParams: Promise.resolve({ q: "no-such-thing" }) });
    render(ui);
    expect(screen.getByTestId("marketplace-search-no-results")).toBeInTheDocument();
  });

  it("renders an error banner when the usecase fails", async () => {
    usecase.mockResolvedValueOnce({
      plugins: [],
      categories: [],
      total: 0,
      error: "HTTP 500",
    });
    const ui = await MarketplaceSearchPage({ searchParams: Promise.resolve({ q: "stripe" }) });
    render(ui);
    expect(screen.getByTestId("marketplace-search-error")).toHaveTextContent("HTTP 500");
  });
});
