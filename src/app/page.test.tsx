import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import HomePage from "./page";
import * as homePageModule from "./page";

describe("HomePage", () => {
  it("renders the storefront entry point", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: "Agentic Ecommerce" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /browse products/i })).toHaveAttribute("href", "/products");
  });

  it("exports explicit indexable home metadata", () => {
    expect(homePageModule.metadata).toEqual(
      expect.objectContaining({
        title: "Agentic Ecommerce",
        description: expect.stringContaining("AI-assisted ecommerce storefront"),
        robots: { index: true, follow: true },
      }),
    );
    expect(homePageModule.metadata?.alternates?.canonical).toBe("/");
  });
});
