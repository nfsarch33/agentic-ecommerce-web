import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarketplaceApiError } from "@/lib/adapters/api/marketplace";

vi.mock("@/lib/server/auth-session", () => ({
  requireServerSession: vi.fn(async () => ({
    user: { id: "u-1", email: "admin@example.com", role: "admin" as const },
    expiresAt: "2099-01-01T00:00:00Z",
  })),
}));

const fetchImpl = vi.fn();
vi.mock("@/lib/adapters/api/marketplace", async () => {
  const actual = await vi.importActual<typeof import("@/lib/adapters/api/marketplace")>(
    "@/lib/adapters/api/marketplace",
  );
  return {
    ...actual,
    fetchMarketplacePlugin: (input: unknown) => fetchImpl(input),
  };
});

const notFoundMock = vi.fn(() => {
  throw new Error("__notfound__");
});
vi.mock("next/navigation", () => ({
  notFound: () => notFoundMock(),
}));

import PluginDetailPage from "./page";

describe("/admin/marketplace/[slug] page", () => {
  beforeEach(() => {
    fetchImpl.mockReset();
    notFoundMock.mockReset().mockImplementation(() => {
      throw new Error("__notfound__");
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the detail panel for a known plugin", async () => {
    fetchImpl.mockResolvedValueOnce({
      slug: "stripe-payments",
      name: "Stripe",
      version: "1.0.0",
      vendor: "Acme",
      eventSubscriptions: [],
      permissions: [],
      dependencies: [],
    });
    const ui = await PluginDetailPage({ params: Promise.resolve({ slug: "stripe-payments" }) });
    render(ui);
    expect(screen.getByTestId("plugin-detail-stripe-payments")).toBeInTheDocument();
  });

  it("calls notFound() on 404", async () => {
    fetchImpl.mockRejectedValueOnce(new MarketplaceApiError("not found", 404));
    await expect(
      PluginDetailPage({ params: Promise.resolve({ slug: "ghost" }) }),
    ).rejects.toThrow("__notfound__");
    expect(notFoundMock).toHaveBeenCalled();
  });
});
