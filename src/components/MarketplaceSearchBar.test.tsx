import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MarketplaceSearchBar } from "./MarketplaceSearchBar";

const pushSpy = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushSpy }),
}));

describe("MarketplaceSearchBar", () => {
  it("submits the query via /marketplace/search?q=", () => {
    pushSpy.mockClear();
    render(<MarketplaceSearchBar />);
    fireEvent.change(screen.getByTestId("marketplace-search-input"), {
      target: { value: "stripe" },
    });
    fireEvent.submit(screen.getByTestId("marketplace-search-bar"));
    expect(pushSpy).toHaveBeenCalledWith("/marketplace/search?q=stripe");
  });

  it("submits without query parameter when input is blank", () => {
    pushSpy.mockClear();
    render(<MarketplaceSearchBar />);
    fireEvent.submit(screen.getByTestId("marketplace-search-bar"));
    expect(pushSpy).toHaveBeenCalledWith("/marketplace/search");
  });
});
