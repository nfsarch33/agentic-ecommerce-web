// File scope: v3.9.1 EC-9-5 operator alerts page wiring tests.
import { describe, expect, it, vi } from "vitest";

const requireServerSession = vi.fn();

vi.mock("@/lib/server/auth-session", () => ({
  requireServerSession: (...args: unknown[]) => requireServerSession(...args),
}));

import OperatorAlertsPage, { metadata } from "./page";

describe("OperatorAlertsPage", () => {
  it("requires an operator session before rendering", async () => {
    requireServerSession.mockResolvedValueOnce({
      user: { id: "u_operator", email: "operator@example.com", role: "operator" },
      expiresAt: "2026-05-18T00:00:00Z",
    });

    const tree = await OperatorAlertsPage();

    expect(requireServerSession).toHaveBeenCalledWith("operator");
    expect(tree).toBeDefined();
  });

  it("exposes private admin metadata", () => {
    expect(metadata.title).toMatch(/Operator/i);
    const robots = metadata.robots as { index: boolean; follow: boolean };
    expect(robots.index).toBe(false);
    expect(robots.follow).toBe(false);
  });
});
