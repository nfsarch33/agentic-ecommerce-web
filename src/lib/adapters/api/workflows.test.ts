import { describe, expect, it, vi } from "vitest";
import {
  WorkflowsApiError,
  fetchWorkflowDetail,
  fetchWorkflowList,
  sendWorkflowReviewSignal,
  startProductPublishWorkflow,
} from "./workflows";

function mockFetch(body: unknown, status = 200): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

const rawSummary = {
  id: "wf_product_publish_1",
  type: "product_publish",
  status: "running",
  product_id: "p_1",
  product_title: "Resistance Band Set",
  current_activity: "Validate media",
  started_at: "2026-05-07T04:00:00Z",
  updated_at: "2026-05-07T04:01:00Z",
};

const rawDetail = {
  ...rawSummary,
  activities: [
    {
      id: "act_check",
      name: "Check compliance",
      status: "completed",
      started_at: "2026-05-07T04:00:00Z",
      completed_at: "2026-05-07T04:00:30Z",
      message: "Passed CCE checks.",
      attempt: 1,
    },
  ],
};

describe("workflows API adapter", () => {
  it("fetches workflow list and maps snake_case fields to domain summaries", async () => {
    const result = await fetchWorkflowList({
      baseUrl: "http://api.test",
      fetchImpl: mockFetch({ workflows: [rawSummary] }),
    });

    expect(result).toEqual([
      {
        id: "wf_product_publish_1",
        type: "product_publish",
        status: "running",
        productId: "p_1",
        productTitle: "Resistance Band Set",
        currentActivity: "Validate media",
        startedAt: "2026-05-07T04:00:00Z",
        updatedAt: "2026-05-07T04:01:00Z",
      },
    ]);
  });

  it("adds status and limit query parameters when listing workflows", async () => {
    const fetchImpl = mockFetch({ workflows: [] });
    await fetchWorkflowList({
      baseUrl: "http://api.test/",
      status: "failed",
      limit: 10,
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://api.test/api/v1/workflows?status=failed&limit=10",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("fetches workflow detail with activity timeline", async () => {
    const result = await fetchWorkflowDetail({
      baseUrl: "http://api.test",
      workflowId: "wf_product_publish_1",
      fetchImpl: mockFetch(rawDetail),
    });

    expect(result.activities).toEqual([
      {
        id: "act_check",
        name: "Check compliance",
        status: "completed",
        startedAt: "2026-05-07T04:00:00Z",
        completedAt: "2026-05-07T04:00:30Z",
        message: "Passed CCE checks.",
        attempt: 1,
      },
    ]);
  });

  it("starts a product publish workflow", async () => {
    const fetchImpl = mockFetch({ workflow: rawSummary }, 202);
    const result = await startProductPublishWorkflow({
      baseUrl: "http://api.test",
      productId: "p_1",
      description: "Operator-approved copy",
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://api.test/api/v1/workflows/product-publish",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ product_id: "p_1", description: "Operator-approved copy" }),
      }),
    );
    expect(result.id).toBe("wf_product_publish_1");
  });

  it("sends human review signals to the workflow", async () => {
    const fetchImpl = mockFetch({ workflow: { ...rawSummary, status: "completed" } }, 202);
    const result = await sendWorkflowReviewSignal({
      baseUrl: "http://api.test",
      workflowId: "wf_product_publish_1",
      signal: "approve",
      note: "Looks good.",
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://api.test/api/v1/workflows/wf_product_publish_1/signals/review",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ signal: "approve", note: "Looks good." }),
      }),
    );
    expect(result.status).toBe("completed");
  });

  it("throws WorkflowsApiError for HTTP failures and invalid response bodies", async () => {
    await expect(
      fetchWorkflowList({ baseUrl: "http://api.test", fetchImpl: mockFetch({}, 500) }),
    ).rejects.toThrow(WorkflowsApiError);
    await expect(
      fetchWorkflowList({ baseUrl: "http://api.test", fetchImpl: mockFetch({}) }),
    ).rejects.toThrow("response body must include workflows array");
  });
});
