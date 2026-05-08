import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MembershipStatusPill } from "./MembershipStatusPill";

describe("MembershipStatusPill", () => {
  it.each(["trial", "active", "paused", "cancelled", "expired"] as const)(
    "renders label and accessible name for %s",
    (state) => {
      render(<MembershipStatusPill state={state} />);
      const pill = screen.getByRole("status", { name: /Membership state/i });
      expect(pill).toBeInTheDocument();
      expect(pill).toHaveAttribute("data-testid", `membership-status-${state}`);
    },
  );

  it("merges custom className", () => {
    render(<MembershipStatusPill state="active" className="custom-class" />);
    expect(screen.getByRole("status")).toHaveClass("custom-class");
  });
});
