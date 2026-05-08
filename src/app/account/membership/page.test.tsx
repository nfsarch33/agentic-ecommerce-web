import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CustomerMembershipPage from "./page";

vi.mock("@/lib/server/auth-session", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((dest: string) => {
    throw new Error(`REDIRECT:${dest}`);
  }),
}));

vi.mock("@/lib/adapters/api/membership-plans", () => ({
  listMembershipPlans: vi.fn(),
}));

vi.mock("@/lib/adapters/api/memberships", () => ({
  listMemberships: vi.fn(),
}));

import { getServerSession } from "@/lib/server/auth-session";
import { listMembershipPlans } from "@/lib/adapters/api/membership-plans";
import { listMemberships } from "@/lib/adapters/api/memberships";

const mockSession = vi.mocked(getServerSession);
const mockPlans = vi.mocked(listMembershipPlans);
const mockMemberships = vi.mocked(listMemberships);

describe("account/membership page", () => {
  it("redirects when no session", async () => {
    mockSession.mockResolvedValue(null);
    await expect(CustomerMembershipPage()).rejects.toThrow(/REDIRECT:.*\/login/);
  });

  it("renders join flow when no membership", async () => {
    mockSession.mockResolvedValue({
      user: { id: "u_1", email: "alice@example.com", role: "viewer" },
      expiresAt: "2026-05-07T10:00:00Z",
    });
    mockPlans.mockResolvedValue({
      plans: [
        {
          id: "plan-1",
          tenantId: "tenant-a",
          name: "Pro",
          billingCycle: "monthly",
          price: { amount: 2900, currency: "AUD" },
          benefits: [],
          createdAt: "2026-05-08T07:30:00Z",
          updatedAt: "2026-05-08T07:30:00Z",
        },
      ],
      total: 1,
      page: 1,
      perPage: 20,
    });
    mockMemberships.mockResolvedValue({
      memberships: [],
      total: 0,
      page: 1,
      perPage: 20,
    });
    render(await CustomerMembershipPage());
    expect(screen.getByText(/Join the membership/)).toBeInTheDocument();
  });

  it("renders existing membership when matched by email", async () => {
    mockSession.mockResolvedValue({
      user: { id: "u_1", email: "alice@example.com", role: "viewer" },
      expiresAt: "2026-05-07T10:00:00Z",
    });
    mockPlans.mockResolvedValue({
      plans: [],
      total: 0,
      page: 1,
      perPage: 0,
    });
    mockMemberships.mockResolvedValue({
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
    render(await CustomerMembershipPage());
    expect(screen.getByText(/My membership/)).toBeInTheDocument();
    expect(screen.getByTestId("membership-status-active")).toBeInTheDocument();
  });
});
