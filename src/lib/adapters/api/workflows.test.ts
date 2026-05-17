import { describe, expect, it, vi } from "vitest";
import type { components } from "./generated/schema";
import {
  WorkflowsApiError,
  fetchWorkflowDetail,
  fetchWorkflowList,
  sendWorkflowReviewSignal,
  startMarketplaceReplayWorkflow,
  startMarketplaceSyncWorkflow,
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

const rawMarketplaceEvent: components["schemas"]["MarketplaceSyncEvent"] = {
  tenant_id: "tenant_1",
  provider: "shopify",
  entity_type: "product",
  entity_id: "p_1",
  external_id: "ext_1",
  operation: "upsert",
  version: "v1",
  payload: { sku: "SKU-1" },
};

const rawMarketplaceDLQRecord: components["schemas"]["MarketplaceDLQRecord"] = {
  id: "dlq_1",
  event: rawMarketplaceEvent,
  attempts: 3,
  reason: "retry budget exhausted",
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

  it("maps review evidence from workflow detail responses", async () => {
    const result = await fetchWorkflowDetail({
      baseUrl: "http://api.test",
      workflowId: "wf_product_publish_1",
      fetchImpl: mockFetch({
        ...rawDetail,
        status: "failed",
        review: {
          approved: false,
          reviewer: "lead@example.com",
          note: "copy needs work",
        },
      }),
    });

    expect(result).toMatchObject({
      review: {
        approved: false,
        reviewer: "lead@example.com",
        note: "copy needs work",
      },
    });
  });

  it("rejects legacy status-only workflow detail responses to avoid synthetic timelines", async () => {
    await expect(
      fetchWorkflowDetail({
        baseUrl: "http://api.test",
        workflowId: "product-publish-123",
        fetchImpl: mockFetch({
          workflow_id: "product-publish-123",
          run_id: "run-123",
          status: "timed_out",
          start_time: "2026-05-07T04:00:00Z",
          close_time: "2026-05-07T04:10:00Z",
        }),
      }),
    ).rejects.toThrow("workflow detail response must include activities array");
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

  it("starts a marketplace sync workflow", async () => {
    const fetchImpl = mockFetch(
      {
        workflow_id: "marketplace-sync-1",
        run_id: "run-sync-1",
        status: "started",
        task_queue: "ec-workflows",
      },
      202,
    );

    const result = await startMarketplaceSyncWorkflow({
      baseUrl: "http://api.test",
      event: rawMarketplaceEvent,
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://api.test/api/v1/workflows/marketplace-sync",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ event: rawMarketplaceEvent }),
      }),
    );
    expect(result.id).toBe("marketplace-sync-1");
    expect(result.type).toBe("marketplace_sync");
  });

  it("starts a marketplace replay workflow", async () => {
    const fetchImpl = mockFetch(
      {
        workflow_id: "marketplace-replay-1",
        run_id: "run-replay-1",
        status: "started",
        task_queue: "ec-workflows",
      },
      202,
    );

    const result = await startMarketplaceReplayWorkflow({
      baseUrl: "http://api.test",
      record: rawMarketplaceDLQRecord,
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://api.test/api/v1/workflows/marketplace-replay",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ record: rawMarketplaceDLQRecord }),
      }),
    );
    expect(result.id).toBe("marketplace-replay-1");
    expect(result.type).toBe("marketplace_replay");
  });

  it("sends human review signals to the workflow", async () => {
    const fetchImpl = mockFetch(
      {
        status: "signaled",
        workflow: {
          ...rawDetail,
          status: "completed",
          current_activity: "Publish to WooCommerce",
          activities: [
            ...rawDetail.activities,
            {
              id: "act_publish",
              name: "Publish to WooCommerce",
              status: "completed",
              started_at: "2026-05-07T04:03:00Z",
              completed_at: "2026-05-07T04:05:00Z",
              message: "Published to WooCommerce.",
              attempt: 1,
            },
          ],
        },
      },
      202,
    );
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
    expect(result).toHaveProperty("activities");
    expect(result).toHaveProperty("activities.1.name", "Publish to WooCommerce");
    expect(result.status).toBe("completed");
  });

  it("requires a workflow lifecycle snapshot when a review signal succeeds", async () => {
    await expect(
      sendWorkflowReviewSignal({
        baseUrl: "http://api.test",
        workflowId: "wf_product_publish_1",
        signal: "approve",
        fetchImpl: mockFetch({ status: "signaled" }, 202),
      }),
    ).rejects.toThrow("sendWorkflowReviewSignal: response body must include workflow detail");
  });

  it("rejects request_changes because the backend has no distinct contract for it", async () => {
    const fetchImpl = vi.fn();

    await expect(
      sendWorkflowReviewSignal({
        baseUrl: "http://api.test",
        workflowId: "wf_product_publish_1",
        signal: "request_changes" as never,
        fetchImpl,
      }),
    ).rejects.toThrow(/request_changes/i);

    expect(fetchImpl).not.toHaveBeenCalled();
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

  it("rejects review signal responses with an invalid status contract", async () => {
    await expect(
      sendWorkflowReviewSignal({
        baseUrl: "http://api.test",
        workflowId: "wf_y",
        signal: "approve",
        fetchImpl: mockFetch({ status: "accepted", workflow: rawDetail }, 202),
      }),
    ).rejects.toThrow("sendWorkflowReviewSignal: response body must include status=signaled");
  });
});
