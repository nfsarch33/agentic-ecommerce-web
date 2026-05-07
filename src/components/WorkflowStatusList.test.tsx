import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { WorkflowSummary } from "@/lib/domain/workflow";
import { WorkflowStatusList } from "./WorkflowStatusList";

const workflows: WorkflowSummary[] = [
  {
    id: "wf_running",
    type: "product_publish",
    status: "running",
    productId: "p_1",
    productTitle: "Resistance Band Set",
    currentActivity: "Validate media",
    startedAt: "2026-05-07T04:00:00Z",
    updatedAt: "2026-05-07T04:01:00Z",
  },
  {
    id: "wf_completed",
    type: "product_publish",
    status: "completed",
    productId: "p_2",
    productTitle: "Yoga Mat",
    startedAt: "2026-05-07T03:00:00Z",
    updatedAt: "2026-05-07T03:05:00Z",
    completedAt: "2026-05-07T03:05:00Z",
  },
  {
    id: "wf_failed",
    type: "product_publish",
    status: "failed",
    productId: "p_3",
    productTitle: "Foam Roller",
    startedAt: "2026-05-07T02:00:00Z",
    updatedAt: "2026-05-07T02:02:00Z",
    error: "WooCommerce publish failed",
  },
];

describe("WorkflowStatusList", () => {
  it("renders running, completed, and failed workflow sections", () => {
    render(
      <WorkflowStatusList workflows={workflows} counts={{ running: 1, completed: 1, failed: 1 }} />,
    );

    expect(screen.getByRole("heading", { name: /workflow status/i })).toBeInTheDocument();
    expect(screen.getAllByText("Running").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Completed").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Failed").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /resistance band set/i })).toHaveAttribute(
      "href",
      "/admin/workflows/wf_running",
    );
    expect(screen.getByText("Validate media")).toBeInTheDocument();
    expect(screen.getByText("WooCommerce publish failed")).toBeInTheDocument();
  });

  it("renders an empty state when there are no workflows", () => {
    render(<WorkflowStatusList workflows={[]} counts={{ running: 0, completed: 0, failed: 0 }} />);

    expect(screen.getByText(/no workflows yet/i)).toBeInTheDocument();
  });

  it("keeps each status group scoped to matching workflows", () => {
    render(
      <WorkflowStatusList workflows={workflows} counts={{ running: 1, completed: 1, failed: 1 }} />,
    );

    const runningSection = screen.getByRole("region", { name: /running workflows/i });
    expect(within(runningSection).getByText("Resistance Band Set")).toBeInTheDocument();
    expect(within(runningSection).queryByText("Yoga Mat")).not.toBeInTheDocument();
  });
});
