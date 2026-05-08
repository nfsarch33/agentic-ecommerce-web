import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PluginCard } from "./PluginCard";

const manifest = {
  slug: "stripe-payments",
  name: "Stripe Payments",
  version: "1.2.0",
  vendor: "Acme",
  description: "Gateway",
  category: "payments",
  eventSubscriptions: [],
  permissions: [],
  dependencies: [],
} as const;

describe("PluginCard", () => {
  it("renders manifest name + vendor + category", () => {
    render(<PluginCard manifest={manifest} />);
    expect(screen.getByText("Stripe Payments")).toBeInTheDocument();
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("payments")).toBeInTheDocument();
    expect(screen.getByTestId(`plugin-card-version-${manifest.slug}`)).toHaveTextContent("v1.2.0");
  });

  it("falls back to vendor when description is missing", () => {
    render(
      <PluginCard
        manifest={{
          ...manifest,
          description: undefined,
        }}
      />,
    );
    expect(screen.getAllByText("Acme").length).toBeGreaterThan(0);
  });

  it("links to the detail page", () => {
    render(<PluginCard manifest={manifest} />);
    const link = screen.getByTestId(`plugin-card-link-${manifest.slug}`);
    expect(link).toHaveAttribute("href", `/admin/marketplace/${manifest.slug}`);
  });
});
