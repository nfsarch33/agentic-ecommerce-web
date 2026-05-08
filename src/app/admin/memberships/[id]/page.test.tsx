import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MembershipDetailPage from "./page";

vi.mock("@/lib/server/auth-session", () => ({
  requireServerSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/lib/adapters/api/memberships", () => ({
  fetchMembership: vi.fn(),
  MembershipsApiError: class MembershipsApiError extends Error {
    override readonly name = "MembershipsApiError";
  },
}));

import { requireServerSession } from "@/lib/server/auth-session";
import { fetchMembership, MembershipsApiError } from "@/lib/adapters/api/memberships";

const mockSession = vi.mocked(requireServerSession);
const mockFetch = vi.mocked(fetchMembership);

describe("admin/memberships/[id] page", () => {
  it("renders membership detail with status pill", async () => {
    mockSession.mockResolvedValue({
      user: { id: "u_1", email: "operator@example.com", role: "operator" },
      expiresAt: "2026-05-07T10:00:00Z",
    });
    mockFetch.mockResolvedValue({
      id: "sub-1",
      tenantId: "tenant-a",
      memberId: "mem-1",
      memberEmail: "alice@example.com",
      planId: "plan-1",
      state: "active",
      currentPeriodStart: "2026-05-08T07:30:00Z",
      currentPeriodEnd: "2026-06-08T07:30:00Z",
      trialEndsAt: "2026-05-15T07:30:00Z",
      createdAt: "2026-05-08T07:30:00Z",
      updatedAt: "2026-05-08T07:30:00Z",
      plan: {
        id: "plan-1",
        tenantId: "tenant-a",
        name: "Pro",
        billingCycle: "monthly",
        price: { amount: 2900, currency: "AUD" },
        benefits: [],
        createdAt: "2026-05-08T07:30:00Z",
        updatedAt: "2026-05-08T07:30:00Z",
      },
    });
    render(
      await MembershipDetailPage({ params: Promise.resolve({ id: "sub-1" }) }),
    );
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    // Pill renders twice: header summary + actions client.
    expect(screen.getAllByTestId("membership-status-active").length).toBeGreaterThanOrEqual(1);
  });

  it("triggers notFound on HTTP 404", async () => {
    mockSession.mockResolvedValue({
      user: { id: "u_1", email: "operator@example.com", role: "operator" },
      expiresAt: "2026-05-07T10:00:00Z",
    });
    mockFetch.mockRejectedValue(new MembershipsApiError("HTTP 404"));
    await expect(
      MembershipDetailPage({ params: Promise.resolve({ id: "missing" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
