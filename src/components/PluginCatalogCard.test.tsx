import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PluginCatalogCard } from "./PluginCatalogCard";
import type { PluginManifest } from "@/lib/domain/marketplace";

const manifest: PluginManifest = {
  slug: "stripe-payments",
  name: "Stripe Payments",
  version: "1.2.0",
  vendor: "Agentic Labs",
  description: "Stripe checkout + webhook bridge.",
  category: "payments",
  eventSubscriptions: [],
  permissions: [],
  dependencies: [],
};

describe("PluginCatalogCard", () => {
  it("renders manifest summary", () => {
    render(<PluginCatalogCard manifest={manifest} />);
    expect(screen.getByText("Stripe Payments")).toBeInTheDocument();
    expect(screen.getByTestId("plugin-catalog-version-stripe-payments")).toHaveTextContent("v1.2.0");
    expect(screen.getByTestId("plugin-catalog-link-stripe-payments")).toBeInTheDocument();
  });

  it("links to the category page when category is set", () => {
    render(<PluginCatalogCard manifest={manifest} />);
    expect(screen.getByTestId("plugin-catalog-category-stripe-payments")).toBeInTheDocument();
  });

  it("falls back to vendor when description is missing", () => {
    const { getAllByText } = render(
      <PluginCatalogCard
        manifest={{ ...manifest, description: undefined }}
      />,
    );
    // Vendor appears twice: once in the description fallback, once in the
    // explicit Vendor row.
    expect(getAllByText("Agentic Labs").length).toBeGreaterThanOrEqual(2);
  });
});
