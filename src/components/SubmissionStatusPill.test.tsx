import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SubmissionStatusPill } from "@/components/SubmissionStatusPill";

describe("SubmissionStatusPill", () => {
  it("renders pending_review label and data-state", () => {
    render(<SubmissionStatusPill state="pending_review" />);
    const pill = screen.getByTestId("submission-status-pill");
    expect(pill.dataset.state).toBe("pending_review");
    expect(pill.textContent).toBe("Pending review");
  });

  it("renders approved label", () => {
    render(<SubmissionStatusPill state="approved" />);
    expect(screen.getByText("Approved")).toBeDefined();
  });

  it("renders rejected label", () => {
    render(<SubmissionStatusPill state="rejected" />);
    expect(screen.getByText("Rejected")).toBeDefined();
  });
});
