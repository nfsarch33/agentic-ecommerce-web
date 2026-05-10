// File scope: v3.9.0 EC-6-5 margin dashboard page wiring tests.
import { describe, expect, it } from "vitest";
import MarginDashboardPage, { metadata } from "./page";

describe("MarginDashboardPage", () => {
  it("returns a JSX tree without throwing", () => {
    const tree = MarginDashboardPage();
    expect(tree).toBeDefined();
  });

  it("exposes private admin metadata", () => {
    expect(metadata.title).toMatch(/Margin/i);
    const robots = metadata.robots as { index: boolean; follow: boolean };
    expect(robots.index).toBe(false);
    expect(robots.follow).toBe(false);
  });
});
