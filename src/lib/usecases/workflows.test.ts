import { describe, expect, it, vi } from "vitest";
import type { WorkflowDetail, WorkflowSummary } from "@/lib/domain/workflow";
import {
  loadWorkflowDetail,
  loadWorkflowList,
  sendReviewSignalForWorkflow,
  startProductPublish,
} from "./workflows";

const workflow: WorkflowSummary = {
  id: "wf_product_publish_1",
  type: "product_publish",
  status: "running",
  productId: "p_1",
  productTitle: "Resistance Band Set",
  startedAt: "2026-05-07T04:00:00Z",
  updatedAt: "2026-05-07T04:01:00Z",
};

const detail: WorkflowDetail = {
  ...workflow,
  activities: [
    {
      id: "act_check",
      name: "Check compliance",
      status: "completed",
    },
  ],
};

describe("workflow usecases", () => {
  it("loads a filtered workflow list through the API adapter", async () => {
    const fetchWorkflowListImpl = vi.fn().mockResolvedValue([workflow]);

    const result = await loadWorkflowList(
      { baseUrl: "http://api.test", status: "running", limit: 25 },
      { fetchWorkflowListImpl },
    );

    expect(result.workflows).toEqual([workflow]);
    expect(result.counts).toEqual({ running: 1, completed: 0, failed: 0 });
    expect(fetchWorkflowListImpl).toHaveBeenCalledWith({
      baseUrl: "http://api.test",
      status: "running",
      limit: 25,
    });
  });

  it("loads workflow detail by id", async () => {
    const fetchWorkflowDetailImpl = vi.fn().mockResolvedValue(detail);

    await expect(
      loadWorkflowDetail(
        { baseUrl: "http://api.test", workflowId: "wf_product_publish_1" },
        { fetchWorkflowDetailImpl },
      ),
    ).resolves.toEqual(detail);
  });

  it("starts a product publish workflow and trims optional description", async () => {
    const startProductPublishWorkflowImpl = vi.fn().mockResolvedValue(workflow);

    const result = await startProductPublish(
      {
        baseUrl: "http://api.test",
        productId: " p_1 ",
        description: "  Operator-approved copy  ",
      },
      { startProductPublishWorkflowImpl },
    );

    expect(result).toEqual(workflow);
    expect(startProductPublishWorkflowImpl).toHaveBeenCalledWith({
      baseUrl: "http://api.test",
      productId: "p_1",
      description: "Operator-approved copy",
    });
  });

  it("sends review signals through the API adapter", async () => {
    const sendWorkflowReviewSignalImpl = vi
      .fn()
      .mockResolvedValue({ ...workflow, status: "completed" });

    await sendReviewSignalForWorkflow(
      {
        baseUrl: "http://api.test",
        workflowId: "wf_product_publish_1",
        signal: "approve",
        note: " Looks good ",
      },
      { sendWorkflowReviewSignalImpl },
    );

    expect(sendWorkflowReviewSignalImpl).toHaveBeenCalledWith({
      baseUrl: "http://api.test",
      workflowId: "wf_product_publish_1",
      signal: "approve",
      note: "Looks good",
    });
  });

  it("rejects blank product and workflow ids before calling adapters", async () => {
    const startProductPublishWorkflowImpl = vi.fn();
    const fetchWorkflowDetailImpl = vi.fn();

    await expect(
      startProductPublish(
        { baseUrl: "http://api.test", productId: " " },
        { startProductPublishWorkflowImpl },
      ),
    ).rejects.toThrow("productId is required");
    await expect(
      loadWorkflowDetail(
        { baseUrl: "http://api.test", workflowId: " " },
        { fetchWorkflowDetailImpl },
      ),
    ).rejects.toThrow("workflowId is required");

    expect(startProductPublishWorkflowImpl).not.toHaveBeenCalled();
    expect(fetchWorkflowDetailImpl).not.toHaveBeenCalled();
  });
});
