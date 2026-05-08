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

  it("maps backend workflow status responses into a synthetic timeline", async () => {
    const result = await fetchWorkflowDetail({
      baseUrl: "http://api.test",
      workflowId: "product-publish-123",
      fetchImpl: mockFetch({
        workflow_id: "product-publish-123",
        run_id: "run-123",
        status: "timed_out",
        start_time: "2026-05-07T04:00:00Z",
        close_time: "2026-05-07T04:10:00Z",
      }),
    });

    expect(result.status).toBe("timed_out");
    expect(result.activities).toEqual([
      expect.objectContaining({
        name: "Temporal execution",
        status: "failed",
        message: "Temporal status: timed out",
      }),
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

  it("accepts backend workflow start responses", async () => {
    const result = await startProductPublishWorkflow({
      baseUrl: "http://api.test",
      productId: "018f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c",
      fetchImpl: mockFetch(
        {
          workflow_id: "product-publish-018f1c8e",
          run_id: "run-123",
          status: "started",
          task_queue: "ec-workflows",
        },
        202,
      ),
    });

    expect(result.id).toBe("product-publish-018f1c8e");
    expect(result.status).toBe("running");
  });

  it("sends human review signals to the workflow", async () => {
    const fetchImpl = mockFetch({ status: "signaled" }, 202);
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
        body: JSON.stringify({ approved: true, note: "Looks good." }),
      }),
    );
    expect(result.id).toBe("wf_product_publish_1");
  });

  it("throws WorkflowsApiError for HTTP failures and invalid response bodies", async () => {
    await expect(
      fetchWorkflowList({ baseUrl: "http://api.test", fetchImpl: mockFetch({}, 500) }),
    ).rejects.toThrow(WorkflowsApiError);
    await expect(
      fetchWorkflowList({ baseUrl: "http://api.test", fetchImpl: mockFetch({}) }),
    ).rejects.toThrow("response body must include workflows array");
  });

  it("wraps network failures from sendWorkflowReviewSignal", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    await expect(
      sendWorkflowReviewSignal({
        baseUrl: "http://api.test",
        workflowId: "wf_x",
        signal: "approve",
        fetchImpl,
      }),
    ).rejects.toThrow(/network error/);
  });

  it("wraps non-2xx responses from sendWorkflowReviewSignal", async () => {
    const fetchImpl = mockFetch({}, 503);
    await expect(
      sendWorkflowReviewSignal({
        baseUrl: "http://api.test",
        workflowId: "wf_x",
        signal: "approve",
        fetchImpl,
      }),
    ).rejects.toThrow(/HTTP 503/);
  });

  it("falls back to a synthetic running summary when the review signal response omits a workflow", async () => {
    const fetchImpl = mockFetch({ status: "accepted" }, 202);
    const result = await sendWorkflowReviewSignal({
      baseUrl: "http://api.test",
      workflowId: "wf_y",
      signal: "approve",
      fetchImpl,
    });
    expect(result.status).toBe("running");
    expect(result.currentActivity).toContain("Review signal accepted");
  });
});
