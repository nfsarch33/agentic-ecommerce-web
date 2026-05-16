import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MarketplaceSubmission } from "@/lib/adapters/api/marketplace-submissions";
import { SubmissionReviewClient } from "./SubmissionReviewClient";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const pendingSubmission: MarketplaceSubmission = {
  id: "sub-1",
  tenantId: "tenant_default",
  submitterEmail: "vendor@example.com",
  manifest: {
    slug: "datadog-metrics",
    name: "Datadog Metrics",
    version: "1.0.0",
    vendor: "Datadog",
    eventSubscriptions: [],
    permissions: [],
    dependencies: [],
  },
  state: "pending_review" as const,
  submittedAt: "2026-05-16T00:00:00Z",
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  refresh.mockReset();
});

describe("SubmissionReviewClient", () => {
  it("updates the visible submission state immediately after a successful rejection", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            submission: {
              ...pendingSubmission,
              state: "rejected",
              reviewer: "admin@example.com",
              reviewedAt: "2026-05-16T01:00:00Z",
              reviewNotes: "missing license",
            },
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        ),
      ),
    );

    render(<SubmissionReviewClient submission={pendingSubmission} />);

    await userEvent.type(screen.getByTestId("review-notes"), "missing license");
    await userEvent.click(screen.getByTestId("reject-button"));

    expect(await screen.findByTestId("review-success")).toHaveTextContent("Submission rejected.");
    expect(screen.getByTestId("submission-status-pill")).toHaveAttribute("data-state", "rejected");
    expect(screen.getByText(/reviewed by admin@example.com/i)).toBeInTheDocument();
  });
});
