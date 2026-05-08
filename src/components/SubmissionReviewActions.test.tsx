import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SubmissionReviewActions } from "@/components/SubmissionReviewActions";

describe("SubmissionReviewActions", () => {
  it("invokes onApprove with notes and shows success", async () => {
    const onApprove = vi.fn(async () => ({ ok: true as const }));
    const onReject = vi.fn(async () => ({ ok: true as const }));
    render(<SubmissionReviewActions submissionId="sub-1" onApprove={onApprove} onReject={onReject} />);

    const notes = screen.getByTestId("review-notes") as HTMLTextAreaElement;
    fireEvent.change(notes, { target: { value: "looks good" } });
    fireEvent.click(screen.getByTestId("approve-button"));

    await waitFor(() => screen.getByTestId("review-success"));
    expect(onApprove).toHaveBeenCalledWith("sub-1", "looks good");
    expect(onReject).not.toHaveBeenCalled();
  });

  it("invokes onReject with notes and shows success", async () => {
    const onApprove = vi.fn(async () => ({ ok: true as const }));
    const onReject = vi.fn(async () => ({ ok: true as const }));
    render(<SubmissionReviewActions submissionId="sub-2" onApprove={onApprove} onReject={onReject} />);

    fireEvent.change(screen.getByTestId("review-notes"), { target: { value: "missing license" } });
    fireEvent.click(screen.getByTestId("reject-button"));

    await waitFor(() => screen.getByTestId("review-success"));
    expect(onReject).toHaveBeenCalledWith("sub-2", "missing license");
  });

  it("renders error message when action fails", async () => {
    const onApprove = vi.fn(async () => ({ ok: false as const, error: "invalid_transition" }));
    const onReject = vi.fn(async () => ({ ok: true as const }));
    render(<SubmissionReviewActions submissionId="sub-3" onApprove={onApprove} onReject={onReject} />);

    fireEvent.click(screen.getByTestId("approve-button"));
    await waitFor(() => screen.getByTestId("review-error"));
    expect(screen.getByTestId("review-error").textContent).toBe("invalid_transition");
  });

  it("disables buttons when disabled prop is set", () => {
    render(
      <SubmissionReviewActions
        submissionId="sub-4"
        disabled
        onApprove={async () => ({ ok: true })}
        onReject={async () => ({ ok: true })}
      />,
    );
    expect((screen.getByTestId("approve-button") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId("reject-button") as HTMLButtonElement).disabled).toBe(true);
  });
});
