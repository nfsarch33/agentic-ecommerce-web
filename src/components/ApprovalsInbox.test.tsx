import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApprovalsInbox } from "./ApprovalsInbox";
import type { WorkflowSummary } from "@/lib/domain/workflow";

function wf(id: string, title: string, activity = "drafted listing"): WorkflowSummary {
  return {
    id,
    type: "product_publish",
    status: "waiting_review",
    productId: `p-${id}`,
    productTitle: title,
    currentActivity: activity,
    startedAt: "2026-09-25T00:00:00Z",
    updatedAt: "2026-09-25T01:00:00Z",
  };
}

const items = [wf("wf1", "Resistance Band Set"), wf("wf2", "Yoga Mat"), wf("wf3", "Foam Roller")];

function mockFetch(ok = true) {
  const fn = vi.fn().mockResolvedValue(
    ok ? new Response("{}", { status: 200 }) : new Response("err", { status: 503 }),
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

beforeEach(() => mockFetch());
afterEach(() => {
  vi.unstubAllGlobals();
  cleanup();
});

describe("ApprovalsInbox", () => {
  it("empty queue is a success state, not a blank", () => {
    render(<ApprovalsInbox workflows={[]} />);
    expect(screen.getByText(/nothing waits on you/i)).toBeTruthy();
  });

  it("error state offers retry and names the error", () => {
    render(<ApprovalsInbox workflows={[]} error="connection refused" />);
    expect(screen.getByRole("alert").textContent).toContain("connection refused");
    expect(screen.getByText(/retry/i)).toBeTruthy();
  });

  it("approve sends the review signal and moves the item out of pending", async () => {
    const fetchMock = mockFetch();
    render(<ApprovalsInbox workflows={items} />);
    await userEvent.click(screen.getByLabelText(/approve resistance band set/i));
    await waitFor(() =>
      expect(screen.getByTestId("item-status-wf1").textContent).toBe("Approved"),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/workflows/wf1/signals/review"),
      expect.objectContaining({ method: "POST" }),
    );
    expect(screen.getByTestId("pending-count").textContent).toBe("2 pending");
  });

  it("reject requires a reason: empty reason is blocked with a message", async () => {
    const fetchMock = mockFetch();
    render(<ApprovalsInbox workflows={items} />);
    await userEvent.click(screen.getByLabelText(/reject yoga mat/i));
    await userEvent.click(screen.getByText(/reject with this reason/i));
    expect(screen.getByRole("alert").textContent).toContain("at least 3 characters");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reject with a reason records the reason on the item", async () => {
    mockFetch();
    render(<ApprovalsInbox workflows={items} />);
    await userEvent.click(screen.getByLabelText(/reject yoga mat/i));
    await userEvent.type(screen.getByLabelText(/rejection reason/i), "wrong size chart");
    await userEvent.click(screen.getByText(/reject with this reason/i));
    await waitFor(() =>
      expect(screen.getByTestId("item-status-wf2").textContent).toContain("wrong size chart"),
    );
  });

  it("batch approve confirms count first, then approves exactly the selection", async () => {
    const fetchMock = mockFetch();
    render(<ApprovalsInbox workflows={items} />);
    await userEvent.click(screen.getByLabelText(/select yoga mat/i));
    await userEvent.click(screen.getByLabelText(/select foam roller/i));
    await userEvent.click(screen.getByText(/approve 2 selected…/i));
    // Confirmation dialog shows the count before anything is sent.
    expect(screen.getByText(/you are approving 2 items/i)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
    await userEvent.click(screen.getByText(/approve all 2/i));
    await waitFor(() =>
      expect(screen.getByTestId("item-status-wf2").textContent).toBe("Approved"),
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // The unselected item is untouched.
    expect(screen.queryByTestId("item-status-wf1")).toBeNull();
  });

  it("a failed signal shows the stale banner and the item stays retryable", async () => {
    mockFetch(false);
    render(<ApprovalsInbox workflows={items} />);
    await userEvent.click(screen.getByLabelText(/approve resistance band set/i));
    await waitFor(() =>
      expect(screen.getByTestId("stale-banner").textContent).toContain("could not be recorded"),
    );
    expect(screen.getByLabelText(/approve resistance band set/i)).toBeTruthy();
  });

  it("the cost column renders a dash, never a zero", () => {
    render(<ApprovalsInbox workflows={items} />);
    const costs = screen.getAllByLabelText(/cost/i);
    expect(costs.length).toBe(3);
    for (const c of costs) expect(c.textContent).toContain("—");
    expect(document.body.textContent).not.toContain("cost 0");
  });
});
