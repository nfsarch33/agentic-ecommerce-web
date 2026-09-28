import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApprovalsInbox } from "./ApprovalsInbox";
import type { WorkflowSummary } from "@/lib/domain/workflow";

function wf(
  id: string,
  title: string,
  status: WorkflowSummary["status"] = "waiting_review",
  activity = "drafted listing",
): WorkflowSummary {
  return {
    id,
    type: "product_publish",
    status,
    productId: `p-${id}`,
    productTitle: title,
    currentActivity: activity,
    startedAt: "2026-09-25T00:00:00Z",
    updatedAt: "2026-09-25T01:00:00Z",
  };
}

const items = [
  wf("wf1", "Resistance Band Set"),
  wf("wf2", "Yoga Mat"),
  wf("wf3", "Foam Roller"),
];

type FetchHandler = (url: string, init?: RequestInit) => Response | Promise<Response>;

function ok202(): Response {
  return new Response(JSON.stringify({ status: "signaled" }), { status: 202 });
}

function statusResponse(status: number): Response {
  return new Response(JSON.stringify({ error: "x" }), { status });
}

/** Stub global fetch; the component's ONLY seam is the same-origin POST. */
function stubFetch(handler: FetchHandler): ReturnType<typeof vi.fn> {
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(typeof input === "string" ? input : input.toString(), init),
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

function normalizeNbsp(text: string): string {
  return text.replace(/\u00a0/g, " ");
}

beforeEach(() => {
  stubFetch(() => ok202());
});
afterEach(() => {
  vi.unstubAllGlobals();
  cleanup();
});

describe("ApprovalsInbox — B1: a failed decision stays actionable", () => {
  it("a FAILED item keeps its Approve/Reject buttons, stays selectable, and counts as pending", async () => {
    stubFetch(() => statusResponse(503));
    render(<ApprovalsInbox workflows={items} />);
    await userEvent.click(screen.getByLabelText(/approve resistance band set/i));
    await waitFor(() =>
      expect(screen.getByTestId("item-status-wf1").textContent).toContain("FAILED"),
    );
    // RESTORED ASSERTION (round-3 B1): the failed item's Approve button
    // must still be present after the failure.
    // Mutant this kills: the button render narrowed back to
    // `status === "pending"` — the failed row loses its buttons.
    expect(screen.getByLabelText(/approve resistance band set/i)).toBeTruthy();
    expect(screen.getByLabelText(/reject resistance band set/i)).toBeTruthy();
    expect(screen.getByLabelText(/select resistance band set/i)).toBeEnabled();
    // Still batchable: it counts as pending and can join a batch.
    expect(screen.getByTestId("pending-count").textContent).toBe("3 pending");
    await userEvent.click(screen.getByLabelText(/select resistance band set/i));
    expect(screen.getByRole("button", { name: /approve 1 selected/i })).toBeEnabled();
  });

  it("a failed reject keeps the dialog open with the typed reason", async () => {
    stubFetch(() => statusResponse(503));
    render(<ApprovalsInbox workflows={items} />);
    await userEvent.click(screen.getByLabelText(/reject yoga mat/i));
    await userEvent.type(screen.getByLabelText(/rejection reason/i), "wrong size chart");
    await userEvent.click(screen.getByText(/reject with this reason/i));
    await waitFor(() =>
      expect(screen.getByTestId("reject-fail-note").textContent).toContain("reason is kept"),
    );
    // Mutant this kills: the dialog closed unconditionally on submit
    // (`setRejecting(null)` before awaiting the result).
    expect(screen.getByRole("dialog", { name: /reject with reason/i })).toBeTruthy();
    expect(screen.getByLabelText(/rejection reason/i)).toHaveValue("wrong size chart");
  });

  it("a FAILED signal is per-item sticky: a later success on another item does not clear it", async () => {
    stubFetch((url) => (url.includes("wf1") ? statusResponse(503) : ok202()));
    render(<ApprovalsInbox workflows={items} />);
    await userEvent.click(screen.getByLabelText(/approve resistance band set/i));
    await waitFor(() =>
      expect(screen.getByTestId("item-status-wf1").textContent).toContain("FAILED"),
    );
    await userEvent.click(screen.getByLabelText(/approve yoga mat/i));
    await waitFor(() =>
      expect(screen.getByTestId("item-status-wf2").textContent).toBe("Approved"),
    );
    // Mutant this kills: `dispatch({type:"fail",id})` deleted, or the
    // banner cleared on every success.
    expect(screen.getByTestId("item-status-wf1").textContent).toContain("FAILED");
    expect(screen.getByTestId("stale-banner")).toBeTruthy();
    await userEvent.click(screen.getByText(/dismiss/i));
    expect(screen.queryByTestId("stale-banner")).toBeNull();
    expect(screen.getByTestId("item-status-wf1").textContent).toContain("FAILED");
  });
});

describe("ApprovalsInbox — B2: one request per decision", () => {
  it("two rapid clicks on Approve send ONE request", async () => {
    let resolveFn!: (r: Response) => void;
    const deferred = new Promise<Response>((res) => {
      resolveFn = res;
    });
    const fn = stubFetch(() => deferred);
    render(<ApprovalsInbox workflows={items} />);
    const btn = screen.getByLabelText(/approve resistance band set/i);
    // Both clicks inside ONE act block run before React re-renders, so
    // the disabled attribute cannot save us — only the in-flight guard
    // can. Mutant this kills: `inflightRef.current.has(id)` check deleted
    // → two POSTs race.
    await act(async () => {
      fireEvent.click(btn);
      fireEvent.click(btn);
    });
    resolveFn(ok202());
    await waitFor(() =>
      expect(screen.getByTestId("item-status-wf1").textContent).toBe("Approved"),
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("approve then reject on the same item sends one request", async () => {
    let resolveFn!: (r: Response) => void;
    const deferred = new Promise<Response>((res) => {
      resolveFn = res;
    });
    const fn = stubFetch(() => deferred);
    render(<ApprovalsInbox workflows={items} />);
    // Open the reject dialog in the same tick as the approve click —
    // the pre-render race — then submit after the approve settles.
    await act(async () => {
      fireEvent.click(screen.getByLabelText(/approve resistance band set/i));
      fireEvent.click(screen.getByLabelText(/reject resistance band set/i));
    });
    resolveFn(ok202());
    await waitFor(() =>
      expect(screen.getByTestId("item-status-wf1").textContent).toBe("Approved"),
    );
    await userEvent.type(screen.getByLabelText(/rejection reason/i), "changed my mind");
    await userEvent.click(screen.getByText(/reject with this reason/i));
    await waitFor(() =>
      expect(screen.getByTestId("item-status-wf1").textContent).toBe("Approved"),
    );
    // Mutant this kills: the `isReviewable` guard in send() deleted →
    // the reject POSTs on an already-approved item.
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn.mock.calls[0]?.[1]?.body).toBe(JSON.stringify({ signal: "approve" }));
  });
});

describe("ApprovalsInbox — classification from status codes", () => {
  it("409 means decided elsewhere: refresh, never retry", async () => {
    stubFetch(() => statusResponse(409));
    render(<ApprovalsInbox workflows={items} />);
    await userEvent.click(screen.getByLabelText(/approve resistance band set/i));
    const banner = await screen.findByTestId("stale-banner");
    // Mutant this kills: the 404/409 branch in classifyStatus deleted →
    // falls to the retry family and prints retry advice.
    expect(banner.textContent).toContain("already recorded elsewhere");
    expect(banner.textContent).toContain("refresh the queue");
    expect(banner.textContent).not.toContain("retry");
  });

  it("a 5xx keeps the retry advice", async () => {
    stubFetch(() => statusResponse(503));
    render(<ApprovalsInbox workflows={items} />);
    await userEvent.click(screen.getByLabelText(/approve resistance band set/i));
    const banner = await screen.findByTestId("stale-banner");
    expect(banner.textContent).toContain("retry");
  });

  it("a network failure says unreachable", async () => {
    stubFetch(() => {
      throw new TypeError("fetch failed");
    });
    render(<ApprovalsInbox workflows={items} />);
    await userEvent.click(screen.getByLabelText(/approve resistance band set/i));
    const banner = await screen.findByTestId("stale-banner");
    expect(banner.textContent).toContain("could not be reached");
    expect(banner.textContent).toContain("retry");
  });
});

describe("ApprovalsInbox — contract", () => {
  it("approve posts SAME-ORIGIN to the BFF route with {signal:'approve'}", async () => {
    const fn = stubFetch(() => ok202());
    render(<ApprovalsInbox workflows={items} />);
    await userEvent.click(screen.getByLabelText(/approve resistance band set/i));
    await waitFor(() => expect(fn).toHaveBeenCalled());
    const firstCall = fn.mock.calls[0];
    expect(firstCall).toBeDefined();
    const [url, init] = firstCall as unknown as [string, RequestInit];
    // Mutant this kills: an absolute upstream URL or a different body
    // (the relative path IS the same-origin contract).
    expect(url).toBe("/api/admin/workflows/wf1/signals/review");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ signal: "approve" });
  });

  it("reject posts {signal:'reject', note} and records the reason", async () => {
    const fn = stubFetch(() => ok202());
    render(<ApprovalsInbox workflows={items} />);
    await userEvent.click(screen.getByLabelText(/reject yoga mat/i));
    await userEvent.type(screen.getByLabelText(/rejection reason/i), "wrong size chart");
    await userEvent.click(screen.getByText(/reject with this reason/i));
    await waitFor(() =>
      expect(screen.getByTestId("item-status-wf2").textContent).toContain("wrong size chart"),
    );
    const init = fn.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(JSON.parse(String(init?.body))).toEqual({
      signal: "reject",
      note: "wrong size chart",
    });
  });

  it("an id with / and ? is percent-encoded in the POST path", async () => {
    const fn = stubFetch(() => ok202());
    render(<ApprovalsInbox workflows={[wf("wf/2?x", "Kettlebell")]} />);
    await userEvent.click(screen.getByLabelText(/approve kettlebell/i));
    await waitFor(() => expect(fn).toHaveBeenCalled());
    // Mutant this kills: encodeURIComponent dropped from signalPath.
    expect(fn.mock.calls[0]?.[0]).toBe("/api/admin/workflows/wf%2F2%3Fx/signals/review");
  });

  it("reject requires a reason: empty and 2-character reasons are blocked with no POST", async () => {
    const fn = stubFetch(() => ok202());
    render(<ApprovalsInbox workflows={items} />);
    await userEvent.click(screen.getByLabelText(/reject yoga mat/i));
    await userEvent.click(screen.getByText(/reject with this reason/i));
    expect(screen.getByRole("alert").textContent).toContain("at least 3 characters");
    // Mutant this kills: the `< 3` guard relaxed (e.g. `<= 0`) → the
    // 2-char reason below would POST.
    await userEvent.type(screen.getByLabelText(/rejection reason/i), "ab");
    await userEvent.click(screen.getByText(/reject with this reason/i));
    expect(screen.getAllByRole("alert").some((a) => /at least 3 characters/.test(a.textContent ?? ""))).toBe(true);
    expect(fn).not.toHaveBeenCalled();
  });

  it("empty queue is a success state, not a blank", () => {
    render(<ApprovalsInbox workflows={[]} />);
    expect(screen.getByText(/nothing waits on you/i)).toBeTruthy();
  });

  it("the cost cell is the exact 'cost —' token, never a zero", () => {
    render(<ApprovalsInbox workflows={items} />);
    const costs = screen.getAllByLabelText(/cost/i);
    expect(costs.length).toBe(3);
    for (const c of costs) {
      // Mutant this kills: the cell rendering `cost 0` (or any other
      // text) instead of the em dash.
      expect(normalizeNbsp(c.textContent ?? "")).toBe("cost —");
    }
    expect(normalizeNbsp(document.body.textContent ?? "")).not.toContain("cost 0");
  });
});

describe("ApprovalsInbox — status boundary and labels", () => {
  const mixed = [
    wf("wf-run", "Still Running", "running"),
    wf("wf-done", "Already Completed", "completed"),
    wf("wf-wait", "Yoga Mat"),
  ];

  it("only waiting_review items are approvable; others show their own status", () => {
    render(<ApprovalsInbox workflows={mixed} />);
    // Mutant this kills: the `wf.status !== "waiting_review"` filter
    // deleted → the running item would show Approve and count pending.
    expect(screen.queryByLabelText(/approve still running/i)).toBeNull();
    expect(screen.queryByLabelText(/reject still running/i)).toBeNull();
    expect(screen.getByLabelText(/select still running/i)).toBeDisabled();
    expect(screen.queryByLabelText(/approve already completed/i)).toBeNull();
    expect(screen.getByLabelText(/approve yoga mat/i)).toBeTruthy();
    expect(screen.getByTestId("pending-count").textContent).toBe("1 pending");
  });

  it("workflow labels are exhaustive with an explicit unknown branch", () => {
    const weird = [{ ...wf("wf-x", "Odd One"), status: "teleported" as WorkflowSummary["status"] }];
    render(<ApprovalsInbox workflows={weird} />);
    // Mutant this kills: the default branch replaced by any catch-all
    // (e.g. rendering "Completed") → the raw status would be hidden.
    expect(screen.getByTestId("item-status-wf-x").textContent).toBe("Unknown status: teleported");
  });

  it("completed and running map to their own labels, not a decision word", () => {
    render(<ApprovalsInbox workflows={mixed} />);
    expect(screen.getByTestId("item-status-wf-run").textContent).toBe("Running");
    // Mutant this kills: the "completed" case deleted from the switch →
    // falls through to "Unknown status: completed".
    expect(screen.getByTestId("item-status-wf-done").textContent).toBe("Completed");
  });
});

describe("ApprovalsInbox — batch", () => {
  it("batch approve STOPS at the first failure and reports the un-sent remainder", async () => {
    const fn = stubFetch((url) => (url.includes("wf2") ? statusResponse(503) : ok202()));
    render(<ApprovalsInbox workflows={items} />);
    await userEvent.click(screen.getByLabelText(/select yoga mat/i));
    await userEvent.click(screen.getByLabelText(/select foam roller/i));
    await userEvent.click(screen.getByText(/approve 2 selected…/i));
    await userEvent.click(screen.getByText(/approve all 2/i));
    await waitFor(() =>
      expect(screen.getByTestId("item-status-wf2").textContent).toContain("FAILED"),
    );
    // The sibling was never sent, so it stays PENDING with its buttons.
    expect(screen.queryByTestId("item-status-wf3")).toBeNull();
    expect(screen.getByLabelText(/approve foam roller/i)).toBeTruthy();
    expect(fn).toHaveBeenCalledTimes(1);
    // Mutant this kills: the batch_stopped dispatch deleted → the
    // operator loses sight of the never-sent remainder.
    expect(screen.getByTestId("batch-not-sent").textContent).toBe("1 selected item was not sent.");
  });

  it("batch confirm shows the cost summary with a dash", async () => {
    render(<ApprovalsInbox workflows={items} />);
    await userEvent.click(screen.getByLabelText(/select yoga mat/i));
    await userEvent.click(screen.getByText(/approve 1 selected…/i));
    const dialog = screen.getByRole("dialog", { name: /confirm batch approve/i });
    expect(dialog.textContent).toContain("Cost:");
    expect(dialog.textContent).toContain("—");
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
  });
});

describe("ApprovalsInbox — dialog semantics", () => {
  it("the reject dialog is modal, takes focus, and Escape returns focus to its opener", async () => {
    render(<ApprovalsInbox workflows={items} />);
    const rejectBtn = screen.getByLabelText(/reject yoga mat/i);
    await userEvent.click(rejectBtn);
    const dialog = screen.getByRole("dialog", { name: /reject with reason/i });
    // Mutant this kills: aria-modal attribute dropped from the dialog.
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    // Focus moves IN on open.
    expect(document.activeElement).toBe(screen.getByLabelText(/rejection reason/i));
    fireEvent.keyDown(dialog, { key: "Escape" });
    // Mutant this kills: Escape handler or focus-return deleted → the
    // dialog lingers or focus stays on the removed textarea.
    expect(screen.queryByRole("dialog", { name: /reject with reason/i })).toBeNull();
    expect(document.activeElement).toBe(rejectBtn);
  });

  it("the preview dialog opens with the workflow detail and Escape closes it", async () => {
    render(<ApprovalsInbox workflows={items} />);
    const previewBtn = screen.getByLabelText(/preview yoga mat/i);
    await userEvent.click(previewBtn);
    const dialog = screen.getByRole("dialog", { name: /preview item/i });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.textContent).toContain("wf2");
    expect(dialog.textContent).toContain("drafted listing");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /close preview/i }));
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: /preview item/i })).toBeNull();
    expect(document.activeElement).toBe(previewBtn);
  });

  it("after a decision, focus moves to the next pending item's Approve", async () => {
    render(<ApprovalsInbox workflows={items} />);
    await userEvent.click(screen.getByLabelText(/approve resistance band set/i));
    await waitFor(() =>
      expect(screen.getByTestId("item-status-wf1").textContent).toBe("Approved"),
    );
    // Mutant this kills: focusNextReviewable deleted from send() →
    // focus falls to body after the wf1 row unmounts its buttons.
    expect(document.activeElement).toBe(screen.getByLabelText(/approve yoga mat/i));
  });
});
