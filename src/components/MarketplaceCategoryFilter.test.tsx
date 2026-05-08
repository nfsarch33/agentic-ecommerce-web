import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarketplaceCategoryFilter } from "./MarketplaceCategoryFilter";

describe("MarketplaceCategoryFilter", () => {
  it("renders nothing when no categories are present", () => {
    const { container } = render(<MarketplaceCategoryFilter categories={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("highlights the All link by default", () => {
    render(<MarketplaceCategoryFilter categories={["payments", "marketing"]} />);
    expect(screen.getByTestId("marketplace-category-link-all")).toHaveClass("bg-blue-500");
  });

  it("highlights the active category", () => {
    render(<MarketplaceCategoryFilter categories={["payments", "marketing"]} activeCategory="payments" />);
    expect(screen.getByTestId("marketplace-category-link-payments")).toHaveClass("bg-blue-500");
    expect(screen.getByTestId("marketplace-category-link-marketing")).not.toHaveClass("bg-blue-500");
  });
});
