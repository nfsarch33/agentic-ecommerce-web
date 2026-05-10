// File scope: v3.9.1 EC-9-5 operator alerts page wiring tests.
import { describe, expect, it } from "vitest";
import OperatorAlertsPage, { metadata } from "./page";

describe("OperatorAlertsPage", () => {
  it("returns a JSX tree without throwing", () => {
    const tree = OperatorAlertsPage();
    expect(tree).toBeDefined();
  });

  it("exposes private admin metadata", () => {
    expect(metadata.title).toMatch(/Operator/i);
    const robots = metadata.robots as { index: boolean; follow: boolean };
    expect(robots.index).toBe(false);
    expect(robots.follow).toBe(false);
  });
});
