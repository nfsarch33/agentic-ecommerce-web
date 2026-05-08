import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MembershipsAdminPage from "./page";

vi.mock("@/lib/server/auth-session", () => ({
  requireServerSession: vi.fn(),
}));

vi.mock("@/lib/adapters/api/memberships", () => ({
  listMemberships: vi.fn(),
}));

import { requireServerSession } from "@/lib/server/auth-session";
import { listMemberships } from "@/lib/adapters/api/memberships";

const mockSession = vi.mocked(requireServerSession);
const mockList = vi.mocked(listMemberships);

describe("admin/memberships page", () => {
  it("renders empty state when backend is unreachable", async () => {
    mockSession.mockResolvedValue({
      user: { id: "u_1", email: "operator@example.com", role: "operator" },
      expiresAt: "2026-05-07T10:00:00Z",
    });
    mockList.mockRejectedValue(new Error("backend down"));
    render(await MembershipsAdminPage());
    expect(screen.getByTestId("memberships-empty")).toBeInTheDocument();
  });

  it("renders membership rows when adapter returns data", async () => {
    mockSession.mockResolvedValue({
      user: { id: "u_1", email: "operator@example.com", role: "operator" },
      expiresAt: "2026-05-07T10:00:00Z",
    });
    mockList.mockResolvedValue({
      memberships: [
        {
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
        },
      ],
      total: 1,
      page: 1,
      perPage: 20,
    });
    render(await MembershipsAdminPage());
    expect(screen.getByTestId("membership-row-sub-1")).toBeInTheDocument();
  });
});
