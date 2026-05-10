// File scope: v3.9.1 Existing #10 onboarding wizard page wiring tests.
import { describe, expect, it } from "vitest";
import OnboardingPage, { metadata } from "./page";

describe("OnboardingPage", () => {
  it("returns a JSX tree without throwing", () => {
    const tree = OnboardingPage();
    expect(tree).toBeDefined();
  });

  it("exposes private admin metadata", () => {
    expect(metadata.title).toMatch(/Onboarding/i);
    const robots = metadata.robots as { index: boolean; follow: boolean };
    expect(robots.index).toBe(false);
    expect(robots.follow).toBe(false);
  });
});
