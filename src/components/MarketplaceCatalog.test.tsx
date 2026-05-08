import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MarketplaceCatalog } from "./MarketplaceCatalog";
import type { PluginManifest } from "@/lib/domain/marketplace";

const manifests: PluginManifest[] = [
  {
    slug: "stripe-payments",
    name: "Stripe Payments",
    version: "1.0.0",
    vendor: "Acme",
    category: "payments",
    eventSubscriptions: [],
    permissions: [],
    dependencies: [],
  },
  {
    slug: "ses-email",
    name: "SES Email",
    version: "1.0.0",
    vendor: "AWS",
    category: "notifications",
    eventSubscriptions: [],
    permissions: [],
    dependencies: [],
  },
];

describe("MarketplaceCatalog", () => {
  it("renders all plugins by default", () => {
    render(<MarketplaceCatalog plugins={manifests} />);
    expect(screen.getByTestId("plugin-card-stripe-payments")).toBeInTheDocument();
    expect(screen.getByTestId("plugin-card-ses-email")).toBeInTheDocument();
  });

  it("filters by search query", async () => {
    const user = userEvent.setup();
    render(<MarketplaceCatalog plugins={manifests} />);
    await user.type(screen.getByTestId("marketplace-search"), "stripe");
    expect(screen.getByTestId("plugin-card-stripe-payments")).toBeInTheDocument();
    expect(screen.queryByTestId("plugin-card-ses-email")).not.toBeInTheDocument();
  });

  it("filters by category", async () => {
    const user = userEvent.setup();
    render(<MarketplaceCatalog plugins={manifests} />);
    await user.selectOptions(screen.getByTestId("marketplace-category"), "payments");
    expect(screen.getByTestId("plugin-card-stripe-payments")).toBeInTheDocument();
    expect(screen.queryByTestId("plugin-card-ses-email")).not.toBeInTheDocument();
  });

  it("renders an empty state when filtering matches nothing", async () => {
    const user = userEvent.setup();
    render(<MarketplaceCatalog plugins={manifests} />);
    await user.type(screen.getByTestId("marketplace-search"), "no-match-here");
    expect(screen.getByTestId("marketplace-empty")).toBeInTheDocument();
  });

  it("surfaces an error banner", () => {
    render(<MarketplaceCatalog plugins={[]} error="boom" />);
    expect(screen.getByTestId("marketplace-error")).toHaveTextContent("boom");
  });
});
