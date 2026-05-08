import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

const usecase = vi.fn();
vi.mock("@/lib/usecases/list-public-marketplace", () => ({
  listPublicMarketplaceUsecase: (input: unknown) => usecase(input),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import MarketplaceCategoryPage from "./page";

describe("/marketplace/categories/[category] page", () => {
  beforeEach(() => usecase.mockReset());
  afterEach(() => vi.restoreAllMocks());

  it("renders plugins for the requested category", async () => {
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
    const ui = await MarketplaceCategoryPage({ params: Promise.resolve({ category: "payments" }) });
    render(ui);
    expect(screen.getByTestId("marketplace-category-payments")).toBeInTheDocument();
    expect(screen.getByTestId("plugin-catalog-card-stripe-payments")).toBeInTheDocument();
  });

  it("renders the empty state when the category has no plugins", async () => {
    usecase.mockResolvedValueOnce({
      plugins: [],
      categories: ["payments"],
      total: 0,
    });
    const ui = await MarketplaceCategoryPage({ params: Promise.resolve({ category: "payments" }) });
    render(ui);
    expect(screen.getByTestId("marketplace-category-empty")).toBeInTheDocument();
  });

  it("renders the error banner when the usecase fails", async () => {
    usecase.mockResolvedValueOnce({
      plugins: [],
      categories: [],
      total: 0,
      error: "HTTP 500",
    });
    const ui = await MarketplaceCategoryPage({ params: Promise.resolve({ category: "payments" }) });
    render(ui);
    expect(screen.getByTestId("marketplace-category-error")).toHaveTextContent("HTTP 500");
  });
});
