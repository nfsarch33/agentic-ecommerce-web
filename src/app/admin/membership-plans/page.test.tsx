import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MembershipPlansAdminPage from "./page";

vi.mock("@/lib/server/auth-session", () => ({
  requireServerSession: vi.fn(),
}));

vi.mock("@/lib/adapters/api/membership-plans", () => ({
  listMembershipPlans: vi.fn(),
  MembershipPlansApiError: class MembershipPlansApiError extends Error {
    override readonly name = "MembershipPlansApiError";
  },
}));

import { requireServerSession } from "@/lib/server/auth-session";
import {
  listMembershipPlans,
  MembershipPlansApiError,
} from "@/lib/adapters/api/membership-plans";

const mockSession = vi.mocked(requireServerSession);
const mockList = vi.mocked(listMembershipPlans);

describe("admin/membership-plans page", () => {
  it("renders empty state when adapter throws expected ApiError", async () => {
    mockSession.mockResolvedValue({
      user: { id: "u_1", email: "operator@example.com", role: "operator" },
      expiresAt: "2026-05-07T10:00:00Z",
    });
    mockList.mockRejectedValue(new MembershipPlansApiError("HTTP 500"));
    render(await MembershipPlansAdminPage());
    expect(screen.getByTestId("membership-plans-empty")).toBeInTheDocument();
  });

  it("renders plans grid when data is returned", async () => {
    mockSession.mockResolvedValue({
      user: { id: "u_1", email: "operator@example.com", role: "operator" },
      expiresAt: "2026-05-07T10:00:00Z",
    });
    mockList.mockResolvedValue({
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
    render(await MembershipPlansAdminPage());
    expect(screen.getByTestId("membership-plan-plan-1")).toBeInTheDocument();
  });
});
