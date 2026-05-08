import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SubmissionsQueue } from "@/components/SubmissionsQueue";
import type { MarketplaceSubmission } from "@/lib/adapters/api/marketplace-submissions";

function row(overrides: Partial<MarketplaceSubmission> = {}): MarketplaceSubmission {
  return {
    id: "sub-1",
    tenantId: "tenant-a",
    submitterEmail: "vendor@a.example",
    manifest: {
      slug: "stripe-payments",
      name: "Stripe",
      version: "1.0.0",
      vendor: "Stripe",
      eventSubscriptions: [],
      permissions: [],
      dependencies: [],
    },
    state: "pending_review",
    submittedAt: "2026-05-09T03:00:00Z",
    ...overrides,
  };
}

describe("SubmissionsQueue", () => {
  it("renders empty state when no submissions", () => {
    render(<SubmissionsQueue submissions={[]} total={0} />);
    expect(screen.getByTestId("submissions-empty")).toBeDefined();
  });

  it("renders one row per submission with link", () => {
    render(
      <SubmissionsQueue
        submissions={[
          row(),
          row({
            id: "sub-2",
            manifest: {
              slug: "ses-email",
              name: "SES",
              version: "1.0.0",
              vendor: "Amazon",
              eventSubscriptions: [],
              permissions: [],
              dependencies: [],
            },
          }),
        ]}
        total={2}
      />,
    );
    expect(screen.getByTestId("submission-row-sub-1")).toBeDefined();
    expect(screen.getByTestId("submission-row-sub-2")).toBeDefined();
    expect((screen.getByTestId("submission-row-link-sub-1") as HTMLAnchorElement).getAttribute("href")).toBe("/admin/marketplace/submissions/sub-1");
  });

  it("shows error banner when error is set", () => {
    render(<SubmissionsQueue submissions={[]} total={0} error="boom" />);
    expect(screen.getByTestId("submissions-queue-error").textContent).toBe("boom");
  });

  it("displays total pending count", () => {
    render(<SubmissionsQueue submissions={[row()]} total={5} />);
    expect(screen.getByTestId("submissions-total").textContent).toBe("5 pending");
  });
});
