import { describe, expect, it } from "vitest";
import {
  WorkflowDomainError,
  countWorkflowsByStatus,
  createWorkflowDetail,
  createWorkflowSummary,
  reviewSignalLabel,
  workflowStatusLabel,
  workflowStatusTone,
} from "./workflow";

const baseSummary = {
  id: "wf_product_publish_1",
  type: "product_publish",
  status: "running",
  productId: "p_1",
  productTitle: "Resistance Band Set",
  startedAt: "2026-05-07T04:00:00Z",
  updatedAt: "2026-05-07T04:01:00Z",
} as const;

describe("workflow domain", () => {
  it("normalizes workflow summaries and labels statuses", () => {
    const summary = createWorkflowSummary(baseSummary);

    expect(summary).toEqual(baseSummary);
    expect(workflowStatusLabel(summary.status)).toBe("Running");
    expect(workflowStatusTone(summary.status)).toBe("blue");
  });

  it("normalizes workflow detail activities", () => {
    const detail = createWorkflowDetail({
      ...baseSummary,
      activities: [
        {
          id: "act_check",
          name: "Check compliance",
          status: "completed",
          startedAt: "2026-05-07T04:00:00Z",
          completedAt: "2026-05-07T04:00:30Z",
          message: "Passed CCE checks.",
        },
      ],
    });

    expect(detail.activities[0]).toEqual({
      id: "act_check",
      name: "Check compliance",
      status: "completed",
      startedAt: "2026-05-07T04:00:00Z",
      completedAt: "2026-05-07T04:00:30Z",
      message: "Passed CCE checks.",
    });
  });

  it("counts running, completed, and failed workflows for dashboard filters", () => {
    expect(
      countWorkflowsByStatus([
        createWorkflowSummary(baseSummary),
        createWorkflowSummary({ ...baseSummary, id: "wf_2", status: "waiting_review" }),
        createWorkflowSummary({ ...baseSummary, id: "wf_3", status: "completed" }),
        createWorkflowSummary({ ...baseSummary, id: "wf_4", status: "failed" }),
        createWorkflowSummary({ ...baseSummary, id: "wf_5", status: "timed_out" }),
      ]),
    ).toEqual({ running: 2, completed: 1, failed: 2 });
  });

  it("labels backend Temporal terminal statuses", () => {
    expect(workflowStatusLabel("canceled")).toBe("Canceled");
    expect(workflowStatusLabel("terminated")).toBe("Terminated");
    expect(workflowStatusLabel("timed_out")).toBe("Timed out");
    expect(workflowStatusTone("continued_as_new")).toBe("gray");
  });

  it("rejects invalid workflow and activity statuses", () => {
    expect(() => createWorkflowSummary({ ...baseSummary, status: "stuck" as never })).toThrow(
      WorkflowDomainError,
    );
    expect(() =>
      createWorkflowDetail({
        ...baseSummary,
        activities: [{ id: "act_1", name: "Bad", status: "done" as never }],
      }),
    ).toThrow("activity.status is invalid");
  });

  it("labels review signals for human review actions", () => {
    expect(reviewSignalLabel("approve")).toBe("Approve");
    expect(reviewSignalLabel("reject")).toBe("Reject");
    expect(reviewSignalLabel("request_changes")).toBe("Request changes");
  });
});
