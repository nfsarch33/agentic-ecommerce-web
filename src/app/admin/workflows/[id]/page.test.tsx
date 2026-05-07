import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import WorkflowDetailPage from "./page";

vi.mock("@/lib/usecases/workflows", () => ({
  loadWorkflowDetail: vi.fn(),
}));

vi.mock("@/components/WorkflowTimeline", () => ({
  WorkflowTimeline: ({
    workflow,
  }: {
    workflow: { productTitle?: string; activities: unknown[] };
  }) => (
    <div>
      <h1>{workflow.productTitle} workflow</h1>
      <p>Activities: {workflow.activities.length}</p>
    </div>
  ),
}));

import { loadWorkflowDetail } from "@/lib/usecases/workflows";

const mockLoadWorkflowDetail = vi.mocked(loadWorkflowDetail);

describe("admin workflow detail page", () => {
  it("loads workflow detail and renders the timeline", async () => {
    mockLoadWorkflowDetail.mockResolvedValue({
      id: "wf_product_publish_1",
      type: "product_publish",
      status: "waiting_review",
      productId: "p_1",
      productTitle: "Resistance Band Set",
      startedAt: "2026-05-07T04:00:00Z",
      updatedAt: "2026-05-07T04:01:00Z",
      activities: [{ id: "act_review", name: "Human review", status: "waiting_review" }],
    });

    render(await WorkflowDetailPage({ params: Promise.resolve({ id: "wf_product_publish_1" }) }));

    expect(
      screen.getByRole("heading", { name: /resistance band set workflow/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Activities: 1")).toBeInTheDocument();
    expect(mockLoadWorkflowDetail).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: "http://localhost:8080",
        workflowId: "wf_product_publish_1",
      }),
    );
  });
});
