import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { WorkflowDetail } from "@/lib/domain/workflow";
import { WorkflowTimeline } from "./WorkflowTimeline";

const detail: WorkflowDetail = {
  id: "wf_product_publish_1",
  type: "product_publish",
  status: "waiting_review",
  productId: "p_1",
  productTitle: "Resistance Band Set",
  currentActivity: "Human review",
  startedAt: "2026-05-07T04:00:00Z",
  updatedAt: "2026-05-07T04:03:00Z",
  activities: [
    {
      id: "act_check",
      name: "Check compliance",
      status: "completed",
      message: "Passed CCE checks.",
      startedAt: "2026-05-07T04:00:00Z",
      completedAt: "2026-05-07T04:00:30Z",
    },
    {
      id: "act_review",
      name: "Human review",
      status: "waiting_review",
      message: "Waiting for an operator signal.",
      startedAt: "2026-05-07T04:01:00Z",
    },
  ],
};

describe("WorkflowTimeline", () => {
  it("renders workflow detail and activity timeline", () => {
    render(<WorkflowTimeline workflow={detail} apiBaseUrl="http://api.test" />);

    expect(
      screen.getByRole("heading", { name: /resistance band set workflow/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Waiting review")).toBeInTheDocument();
    expect(screen.getByText("Check compliance")).toBeInTheDocument();
    expect(screen.getByText("Passed CCE checks.")).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: /activity timeline/i })).getByText("Human review"),
    ).toBeInTheDocument();
  });

  it("sends an approve review signal and reports success", async () => {
    const user = userEvent.setup();
    const sendReviewSignalImpl = vi.fn().mockResolvedValue({ ...detail, status: "completed" });

    render(
      <WorkflowTimeline
        workflow={detail}
        apiBaseUrl="http://api.test"
        sendReviewSignalImpl={sendReviewSignalImpl}
      />,
    );

    await user.type(screen.getByLabelText(/review note/i), "Approved by QA");
    await user.click(screen.getByRole("button", { name: /approve/i }));

    expect(sendReviewSignalImpl).toHaveBeenCalledWith({
      baseUrl: "http://api.test",
      workflowId: "wf_product_publish_1",
      signal: "approve",
      note: "Approved by QA",
    });
    expect(await screen.findByRole("status")).toHaveTextContent(/sent approve signal/i);
  });

  it("re-renders the workflow lifecycle from the backend signal response", async () => {
    const user = userEvent.setup();
    const sendReviewSignalImpl = vi.fn().mockResolvedValue({
      ...detail,
      status: "completed",
      currentActivity: "Publish to WooCommerce",
      updatedAt: "2026-05-07T04:05:00Z",
      completedAt: "2026-05-07T04:05:00Z",
      activities: [
        ...detail.activities,
        {
          id: "act_publish",
          name: "Publish to WooCommerce",
          status: "completed",
          message: "Published to WooCommerce.",
          startedAt: "2026-05-07T04:03:00Z",
          completedAt: "2026-05-07T04:05:00Z",
        },
      ],
    });

    render(
      <WorkflowTimeline
        workflow={detail}
        apiBaseUrl="http://api.test"
        sendReviewSignalImpl={sendReviewSignalImpl}
      />,
    );

    await user.click(screen.getByRole("button", { name: /approve/i }));

    expect(await screen.findByText("Completed")).toBeInTheDocument();
    expect(screen.getAllByText("Publish to WooCommerce").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Published to WooCommerce.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /approve/i })).not.toBeInTheDocument();
  });

  it("shows an error when a review signal fails", async () => {
    const user = userEvent.setup();
    const sendReviewSignalImpl = vi.fn().mockRejectedValue(new Error("Temporal signal failed"));

    render(
      <WorkflowTimeline
        workflow={detail}
        apiBaseUrl="http://api.test"
        sendReviewSignalImpl={sendReviewSignalImpl}
      />,
    );

    await user.click(screen.getByRole("button", { name: /reject/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Temporal signal failed");
  });

  it("does not render review actions once the workflow is completed", () => {
    render(
      <WorkflowTimeline
        workflow={{ ...detail, status: "completed" }}
        apiBaseUrl="http://api.test"
      />,
    );

    expect(screen.queryByRole("button", { name: /approve/i })).not.toBeInTheDocument();
    expect(screen.getByText(/review signals are available/i)).toBeInTheDocument();
  });
});
