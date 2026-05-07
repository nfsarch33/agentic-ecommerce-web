import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import WorkflowsPage from "./page";

vi.mock("@/lib/usecases/workflows", () => ({
  loadWorkflowList: vi.fn(),
}));

vi.mock("@/components/WorkflowStatusList", () => ({
  WorkflowStatusList: ({
    workflows,
  }: {
    workflows: Array<{ id: string; productTitle?: string }>;
  }) => (
    <div>
      <h1>Workflow Status</h1>
      {workflows.map((workflow) => (
        <p key={workflow.id}>{workflow.productTitle}</p>
      ))}
    </div>
  ),
}));

import { loadWorkflowList } from "@/lib/usecases/workflows";

const mockLoadWorkflowList = vi.mocked(loadWorkflowList);

describe("admin workflows page", () => {
  it("loads workflow list from the backend and renders status UI", async () => {
    mockLoadWorkflowList.mockResolvedValue({
      workflows: [
        {
          id: "wf_product_publish_1",
          type: "product_publish",
          status: "running",
          productId: "p_1",
          productTitle: "Resistance Band Set",
          startedAt: "2026-05-07T04:00:00Z",
          updatedAt: "2026-05-07T04:01:00Z",
        },
      ],
      counts: { running: 1, completed: 0, failed: 0 },
    });

    render(await WorkflowsPage());

    expect(screen.getByRole("heading", { name: /workflow status/i })).toBeInTheDocument();
    expect(screen.getByText("Resistance Band Set")).toBeInTheDocument();
    expect(mockLoadWorkflowList).toHaveBeenCalledWith(
      expect.objectContaining({ baseUrl: "http://localhost:8080", limit: 50 }),
    );
  });
});
