import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ProductDetailPage from "./page";

vi.mock("@/lib/adapters/api/products", () => ({
  fetchProductBySlug: vi.fn(),
}));

import { fetchProductBySlug } from "@/lib/adapters/api/products";

const mockFetchProductBySlug = vi.mocked(fetchProductBySlug);

const fakeProduct = {
  id: "p_widget-pro",
  title: "Widget Pro",
  slug: "widget-pro",
  price: { amount: 4999, currency: "AUD" as const },
  stock: 12,
  description: "A premium widget for professionals",
};

describe("ProductDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders product title and description", async () => {
    mockFetchProductBySlug.mockResolvedValue(fakeProduct as never);
    const page = await ProductDetailPage({ params: Promise.resolve({ slug: "widget-pro" }) });
    render(page);
    expect(screen.getByRole("heading", { name: "Widget Pro" })).toBeInTheDocument();
    expect(screen.getByText("A premium widget for professionals")).toBeInTheDocument();
  });

  it("renders product price formatted", async () => {
    mockFetchProductBySlug.mockResolvedValue(fakeProduct as never);
    const page = await ProductDetailPage({ params: Promise.resolve({ slug: "widget-pro" }) });
    render(page);
    expect(screen.getByText(/A\$49\.99/)).toBeInTheDocument();
  });

  it("renders stock status for in-stock items", async () => {
    mockFetchProductBySlug.mockResolvedValue(fakeProduct as never);
    const page = await ProductDetailPage({ params: Promise.resolve({ slug: "widget-pro" }) });
    render(page);
    expect(screen.getByText("In stock")).toBeInTheDocument();
  });

  it("renders out-of-stock status", async () => {
    mockFetchProductBySlug.mockResolvedValue({
      ...fakeProduct,
      stock: 0,
    } as never);
    const page = await ProductDetailPage({ params: Promise.resolve({ slug: "widget-pro" }) });
    render(page);
    expect(screen.getByText("Out of stock")).toBeInTheDocument();
  });

  it("renders a back link to products list", async () => {
    mockFetchProductBySlug.mockResolvedValue(fakeProduct as never);
    const page = await ProductDetailPage({ params: Promise.resolve({ slug: "widget-pro" }) });
    render(page);
    const link = screen.getByRole("link", { name: /products/i });
    expect(link).toHaveAttribute("href", "/products");
  });

  it("calls fetchProductBySlug with correct slug", async () => {
    mockFetchProductBySlug.mockResolvedValue(fakeProduct as never);
    await ProductDetailPage({ params: Promise.resolve({ slug: "widget-pro" }) });
    expect(mockFetchProductBySlug).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "widget-pro" }),
    );
  });
});
