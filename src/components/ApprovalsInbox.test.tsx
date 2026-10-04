import { describe, expect, it, vi, beforeEach, beforeAll, afterEach } from "vitest";
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

function headersOf(call: unknown): Record<string, string> {
  const init = (call as unknown[])[1] as RequestInit | undefined;
  return (init?.headers ?? {}) as Record<string, string>;
}

// jsdom ships HTMLDialogElement without showModal/close; the component
// uses the native API and Playwright exercises it in a real browser, so
// the unit tests stub the minimum: open-attribute bookkeeping.
beforeAll(() => {
  if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      this.removeAttribute("open");
    };
  }
});

beforeEach(() => {
  stubFetch(() => ok202());
});
afterEach(() => {
  vi.unstubAllGlobals();
  cleanup();
});

describe("B1 — a failed decision stays actionable", () => {
  it("a FAILED item keeps its Approve/Reject buttons, stays selectable, and counts as pending", async () => {
    stubFetch(() => statusResponse(503));
    render(<ApprovalsInbox workflows={items} />);
    await userEvent.click(screen.getByLabelText(/approve resistance band set/i));
    await waitFor(() =>
      expect(screen.getByTestId("item-status-wf1").textContent).toContain("FAILED"),
    );
    // Mutant this kills: the button render narrowed to pending-only —
    // the failed row loses its buttons.
    expect(screen.getByLabelText(/approve resistance band set/i)).toBeTruthy();
    expect(screen.getByLabelText(/reject resistance band set/i)).toBeTruthy();
    expect(screen.getByLabelText(/select resistance band set/i)).toBeEnabled();
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
    // Mutant this kills: the dialog closed unconditionally on submit.
    expect(screen.getByRole("dialog", { name: /reject with reason/i })).toHaveAttribute("open");
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
    // Mutant this kills: the fail dispatch deleted, or the banner
    // cleared on every success.
    expect(screen.getByTestId("item-status-wf1").textContent).toContain("FAILED");
    expect(screen.getByTestId("stale-banner")).toBeTruthy();
    await userEvent.click(screen.getByText(/dismiss/i));
    expect(screen.queryByTestId("stale-banner")).toBeNull();
    expect(screen.getByTestId("item-status-wf1").textContent).toContain("FAILED");
  });
});

describe("B5 — decided elsewhere is terminal on the ROW", () => {
  it("a 409 row says decided elsewhere, loses its buttons, and leaves pending", async () => {
    stubFetch(() => statusResponse(409));
    render(<ApprovalsInbox workflows={items} />);
    await userEvent.click(screen.getByLabelText(/approve resistance band set/i));
    // The ROW, not only the banner (the banner has its own copy; the row
    // must never offer the decision again).
    await waitFor(() =>
      expect(screen.getByTestId("item-status-wf1").textContent).toBe(
        "Decided elsewhere — refresh the queue",
      ),
    );
    // Mutant this kills: the decided-elsewhere status treated as plain
    // "failed" — the buttons would still render.
    expect(screen.queryByLabelText(/approve resistance band set/i)).toBeNull();
    expect(screen.queryByLabelText(/reject resistance band set/i)).toBeNull();
    expect(screen.getByLabelText(/select resistance band set/i)).toBeDisabled();
    expect(screen.getByTestId("pending-count").textContent).toBe("2 pending");
    // And it can no longer join a batch.
    expect(screen.getByRole("button", { name: /select all pending/i })).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /select all pending/i }));
    expect(screen.getByRole("button", { name: /approve 2 selected/i })).toBeTruthy();
  });

  it("an upstream session expiry (401) says sign in again on the row but keeps retry buttons", async () => {
    stubFetch(() => statusResponse(401));
    render(<ApprovalsInbox workflows={items} />);
    await userEvent.click(screen.getByLabelText(/approve resistance band set/i));
    // Mutant this kills: 401 lumped into the retry family.
    await waitFor(() =>
      expect(screen.getByTestId("item-status-wf1").textContent).toContain("sign in again"),
    );
    expect(screen.getByLabelText(/approve resistance band set/i)).toBeTruthy();
  });

  it("an invalid decision (422) is marked not recorded and not retryable", async () => {
    stubFetch(() => statusResponse(422));
    render(<ApprovalsInbox workflows={items} />);
    await userEvent.click(screen.getByLabelText(/approve resistance band set/i));
    await waitFor(() =>
      expect(screen.getByTestId("item-status-wf1").textContent).toContain("refused as invalid"),
    );
    const banner = screen.getByTestId("stale-banner");
    expect(banner.textContent).not.toContain("retry it");
  });

  it("one item's decided-elsewhere failure does not re-label another item's retryable row", async () => {
    stubFetch((url) => (url.includes("wf1") ? statusResponse(503) : statusResponse(409)));
    render(<ApprovalsInbox workflows={items} />);
    await userEvent.click(screen.getByLabelText(/approve resistance band set/i));
    await waitFor(() =>
      expect(screen.getByTestId("item-status-wf1").textContent).toContain("FAILED"),
    );
    await userEvent.click(screen.getByLabelText(/approve yoga mat/i));
    await waitFor(() =>
      expect(screen.getByTestId("item-status-wf2").textContent).toContain("Decided elsewhere"),
    );
    // Mutant this kills: the row label read from the shared banner —
    // wf1's row would flip to decided-elsewhere after wf2's 409.
    expect(screen.getByTestId("item-status-wf1").textContent).toContain("FAILED");
    expect(screen.getByTestId("item-status-wf1").textContent).not.toContain("elsewhere");
  });

  it("409 means decided elsewhere in the banner: refresh, never retry", async () => {
    stubFetch(() => statusResponse(409));
    render(<ApprovalsInbox workflows={items} />);
    await userEvent.click(screen.getByLabelText(/approve resistance band set/i));
    const banner = await screen.findByTestId("stale-banner");
    // Mutant this kills: the 404/409 branch in classifyStatus deleted.
    expect(banner.textContent).toContain("decided elsewhere");
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

describe("B2 — one request per decision (single lock)", () => {
  it("two rapid clicks on Approve send ONE request", async () => {
    let resolveFn!: (r: Response) => void;
    const deferred = new Promise<Response>((res) => {
      resolveFn = res;
    });
    const fn = stubFetch(() => deferred);
    render(<ApprovalsInbox workflows={items} />);
    const btn = screen.getByLabelText(/approve resistance band set/i);
    // Both clicks inside ONE act block run before React re-renders, so
    // the disabled attribute cannot save us — only the synchronous
    // status-mirror lock can. Mutant this kills:
    // `statuses[id] = "inflight"` deleted → two POSTs race. (There is no
    // second lock any more: this is the proof against the vacuous pair.)
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
    // Mutant this kills: the isReviewable guard in send() deleted →
    // the reject POSTs on an already-approved item.
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn.mock.calls[0]?.[1]?.body).toBe(JSON.stringify({ signal: "approve" }));
  });

  it("a batch confirm double-click runs the loop ONCE", async () => {
    const resolvers: Array<(r: Response) => void> = [];
    const fn = stubFetch(
      () => new Promise<Response>((res) => resolvers.push(res)),
    );
    render(<ApprovalsInbox workflows={items} />);
    await userEvent.click(screen.getByLabelText(/select yoga mat/i));
    await userEvent.click(screen.getByLabelText(/select foam roller/i));
    await userEvent.click(screen.getByText(/approve 2 selected…/i));
    const confirm = screen.getByTestId("batch-confirm");
    await act(async () => {
      fireEvent.click(confirm);
      fireEvent.click(confirm);
    });
    for (const r of resolvers.splice(0)) r(ok202());
    await waitFor(() =>
      expect(screen.getByTestId("item-status-wf2").textContent).toBe("Approved"),
    );
    // Mutant this kills: the batchRunningRef guard deleted → the second
    // click starts a second loop and 4 POSTs go out.
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("stale reject continuation", () => {
  it("a slow decision for A does not close B's dialog or touch B's reason", async () => {
    let resolveWf1!: (r: Response) => void;
    const fn = stubFetch((url) =>
      url.includes("wf1")
        ? new Promise<Response>((res) => {
            resolveWf1 = res;
          })
        : ok202(),
    );
    render(<ApprovalsInbox workflows={items} />);
    // Open A's reject dialog and submit (slow — wf1 pending).
    await userEvent.click(screen.getByLabelText(/reject resistance band set/i));
    await userEvent.type(screen.getByLabelText(/rejection reason/i), "A reason");
    await userEvent.click(screen.getByText(/reject with this reason/i));
    // While A is in flight, cancel and open B's dialog instead.
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    await userEvent.click(screen.getByLabelText(/reject yoga mat/i));
    await userEvent.type(screen.getByLabelText(/rejection reason/i), "B reason");
    resolveWf1(ok202());
    await waitFor(() =>
      expect(screen.getByTestId("item-status-wf1").textContent).toBe("Rejected: A reason"),
    );
    // Mutant this kills: the `if (rejecting !== id) return` guard deleted
    // — A's settling continuation closes B's dialog and loses "B reason".
    const bDialog = screen.getByRole("dialog", { name: /reject with reason/i });
    expect(bDialog).toHaveAttribute("open");
    expect(screen.getByLabelText(/rejection reason/i)).toHaveValue("B reason");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("a refused reject (item decided elsewhere meanwhile) shows a message, not a silent no-op", async () => {
    const fn = stubFetch(() => ok202());
    render(<ApprovalsInbox workflows={items} />);
    await userEvent.click(screen.getByLabelText(/reject resistance band set/i));
    await userEvent.type(screen.getByLabelText(/rejection reason/i), "bad pick");
    // Decide wf1 through its Approve button WHILE the dialog is open —
    // same tick, pre-render race.
    await act(async () => {
      fireEvent.click(screen.getByLabelText(/approve resistance band set/i));
    });
    await waitFor(() =>
      expect(screen.getByTestId("item-status-wf1").textContent).toBe("Approved"),
    );
    await userEvent.click(screen.getByText(/reject with this reason/i));
    // Mutant this kills: the refused branch silent (no reasonError) —
    // the operator would not know nothing happened.
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("can no longer be decided here"),
    );
    expect(fn).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("item-status-wf1").textContent).toBe("Approved");
  });
});

describe("contract", () => {
  it("approve posts SAME-ORIGIN with {signal:'approve'} and an Idempotency-Key per click", async () => {
    const fn = stubFetch(() => ok202());
    render(<ApprovalsInbox workflows={items} />);
    await userEvent.click(screen.getByLabelText(/approve resistance band set/i));
    await userEvent.click(screen.getByLabelText(/approve yoga mat/i));
    await waitFor(() => expect(fn).toHaveBeenCalledTimes(2));
    const first = fn.mock.calls[0];
    const second = fn.mock.calls[1];
    // Mutant this kills: an absolute upstream URL or a different body.
    expect(first?.[0]).toBe("/api/admin/workflows/wf1/signals/review");
    expect((first?.[1] as RequestInit).method).toBe("POST");
    expect(JSON.parse(String((first?.[1] as RequestInit).body))).toEqual({ signal: "approve" });
    const key1 = headersOf(first)["idempotency-key"];
    const key2 = headersOf(second)["idempotency-key"];
    // Mutant this kills: a fixed key (or none) — every click must be a
    // fresh attempt identity.
    expect(key1).toMatch(/^[0-9a-f-]{36}$/);
    expect(key2).toMatch(/^[0-9a-f-]{36}$/);
    expect(key1).not.toBe(key2);
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
    expect(JSON.parse(String(init?.body))).toEqual({ signal: "reject", note: "wrong size chart" });
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
    // Mutant this kills: the `< 3` guard relaxed to `<= 0`.
    await userEvent.type(screen.getByLabelText(/rejection reason/i), "ab");
    await userEvent.click(screen.getByText(/reject with this reason/i));
    expect(
      screen.getAllByRole("alert").some((a) => /at least 3 characters/.test(a.textContent ?? "")),
    ).toBe(true);
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

describe("status boundary and labels", () => {
  const mixed = [
    wf("wf-run", "Still Running", "running"),
    wf("wf-done", "Already Completed", "completed"),
    wf("wf-wait", "Yoga Mat"),
  ];

  it("only waiting_review items are approvable; others show their own status", () => {
    render(<ApprovalsInbox workflows={mixed} />);
    // Mutant this kills: the wf.status filter deleted.
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
    // Mutant this kills: the default branch replaced by any catch-all.
    expect(screen.getByTestId("item-status-wf-x").textContent).toBe("Unknown status: teleported");
  });

  it("completed and running map to their own labels, not a decision word", () => {
    render(<ApprovalsInbox workflows={mixed} />);
    expect(screen.getByTestId("item-status-wf-run").textContent).toBe("Running");
    // Mutant this kills: the "completed" case deleted from the switch.
    expect(screen.getByTestId("item-status-wf-done").textContent).toBe("Completed");
  });
});

describe("batch", () => {
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
    expect(screen.queryByTestId("item-status-wf3")).toBeNull();
    expect(screen.getByLabelText(/approve foam roller/i)).toBeTruthy();
    expect(fn).toHaveBeenCalledTimes(1);
    // Mutant this kills: the batch_stopped dispatch deleted.
    expect(screen.getByTestId("batch-not-sent").textContent).toBe("1 selected item was not sent.");
  });

  it("batch confirm shows the exact cost summary token", async () => {
    render(<ApprovalsInbox workflows={items} />);
    await userEvent.click(screen.getByLabelText(/select yoga mat/i));
    await userEvent.click(screen.getByText(/approve 1 selected…/i));
    const dialog = screen.getByRole("dialog", { name: /confirm batch approve/i });
    // Mutant this kills: the em dash deleted from the prose — the exact
    // token fails (the old toContain("—") passed on any dash anywhere).
    expect(normalizeNbsp(dialog.textContent ?? "")).toContain("Cost: — per item");
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
  });
});

describe("dialog semantics (native <dialog>)", () => {
  it("the reject dialog is modal, takes focus, and Escape returns focus to its opener", async () => {
    render(<ApprovalsInbox workflows={items} />);
    const rejectBtn = screen.getByLabelText(/reject yoga mat/i);
    await userEvent.click(rejectBtn);
    const dialog = screen.getByRole("dialog", { name: /reject with reason/i });
    // Mutant this kills: showModal not called on open.
    expect(dialog).toHaveAttribute("open");
    expect(document.activeElement).toBe(screen.getByLabelText(/rejection reason/i));
    fireEvent.keyDown(dialog, { key: "Escape" });
    // Mutant this kills: the Escape handler or focus-return deleted.
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: /reject — a reason is required/i })).toBeNull(),
    );
    expect(document.activeElement).toBe(rejectBtn);
  });

  it("the preview dialog opens with the workflow detail and Escape closes it", async () => {
    render(<ApprovalsInbox workflows={items} />);
    const previewBtn = screen.getByLabelText(/preview yoga mat/i);
    await userEvent.click(previewBtn);
    const dialog = screen.getByRole("dialog", { name: /preview item/i });
    expect(dialog).toHaveAttribute("open");
    expect(dialog.textContent).toContain("wf2");
    expect(dialog.textContent).toContain("drafted listing");
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: /preview/i })).toBeNull(),
    );
    expect(document.activeElement).toBe(previewBtn);
  });

  it("after a decision, focus moves to the next pending ROW (roving index, one space)", async () => {
    render(<ApprovalsInbox workflows={items} />);
    await userEvent.click(screen.getByLabelText(/approve resistance band set/i));
    await waitFor(() =>
      expect(screen.getByTestId("item-status-wf1").textContent).toBe("Approved"),
    );
    // Mutant this kills: focusNextReviewable deleted from send().
    expect(document.activeElement).toBe(screen.getByText("Yoga Mat").closest("li"));
  });
});

describe("keyboard path (roving tabIndex, one index space)", () => {
  function row(id: string): HTMLElement {
    return document.querySelector(`li[data-row-id="${id}"]`) as HTMLElement;
  }

  it("exactly one row is tabbable and j/k move focus through it", async () => {
    render(<ApprovalsInbox workflows={items} />);
    const tabbables = document.querySelectorAll('li[data-row-id][tabindex="0"]');
    expect(tabbables.length).toBe(1);
    row("wf1").focus();
    fireEvent.keyDown(row("wf1"), { key: "j" });
    // Mutant this kills: the j case deleted (or focusRow not called) —
    // activeElement stays on wf1's row.
    expect(document.activeElement).toBe(row("wf2"));
    fireEvent.keyDown(row("wf2"), { key: "k" });
    expect(document.activeElement).toBe(row("wf1"));
    // k at the top and j at the bottom clamp, never leave the list.
    fireEvent.keyDown(row("wf1"), { key: "k" });
    expect(document.activeElement).toBe(row("wf1"));
  });

  it("A approves the FOCUSED row — and still the right row after a prior decision", async () => {
    const fn = stubFetch(() => ok202());
    render(<ApprovalsInbox workflows={items} />);
    // Prior decision via the mouse on wf1.
    await userEvent.click(screen.getByLabelText(/approve resistance band set/i));
    await waitFor(() =>
      expect(screen.getByTestId("item-status-wf1").textContent).toBe("Approved"),
    );
    // The roving index landed on wf2's row; A must act on wf2 — one
    // index space means approving row 1 never shifted the rows.
    expect(document.activeElement).toBe(row("wf2"));
    fireEvent.keyDown(row("wf2"), { key: "a" });
    await waitFor(() =>
      expect(screen.getByTestId("item-status-wf2").textContent).toBe("Approved"),
    );
    // Mutant this kills: the keyboard approve reading the wrong index
    // space (e.g. always row 0) — wf3 would have been approved.
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn.mock.calls[1]?.[0]).toBe("/api/admin/workflows/wf2/signals/review");
  });

  it("focus by click syncs the roving index — Tab returns to the last-used row", () => {
    render(<ApprovalsInbox workflows={items} />);
    // A mouse click focuses the row WITHOUT j/k: the roving tabIndex must
    // follow, or the next Tab leaves the list at row 0, not wf3.
    fireEvent.focus(row("wf3"));
    // Mutant this kills: the onFocus sync on the row deleted — wf3 keeps
    // tabIndex -1 and wf1 keeps the single tab stop.
    expect(row("wf3")).toHaveAttribute("tabindex", "0");
    expect(row("wf1")).toHaveAttribute("tabindex", "-1");
  });

  it("key-repeat and modifier combos never act", async () => {
    const fn = stubFetch(() => ok202());
    render(<ApprovalsInbox workflows={items} />);
    row("wf1").focus();
    fireEvent.keyDown(row("wf1"), { key: "a", ctrlKey: true });
    fireEvent.keyDown(row("wf1"), { key: "a", metaKey: true });
    fireEvent.keyDown(row("wf1"), { key: "a", altKey: true });
    await waitFor(() => expect(fn).not.toHaveBeenCalled());
    // A HELD key: the first keydown acts, the repeats must not. This is
    // defense in DEPTH over three layers (documented survivor pattern):
    // the e.repeat guard (event layer), the synchronous statuses mirror
    // (send's own refusal), and reviewableIds re-derived from state on
    // the re-render between events. Deleting ANY ONE layer still sends
    // exactly once (proven by mutation this round); the criterion is
    // enforced by the trio.
    fireEvent.keyDown(row("wf1"), { key: "a", repeat: false });
    fireEvent.keyDown(row("wf1"), { key: "a", repeat: true });
    fireEvent.keyDown(row("wf1"), { key: "a", repeat: true });
    await waitFor(() => expect(fn).toHaveBeenCalledTimes(1));
    expect(fn.mock.calls[0]?.[0]).toBe("/api/admin/workflows/wf1/signals/review");
    // The approve succeeded: focus advanced to the next reviewable row.
    expect(document.activeElement).toBe(row("wf2"));
  });

  it("keys from a focused BUTTON inside the row never act", async () => {
    const fn = stubFetch(() => ok202());
    render(<ApprovalsInbox workflows={items} />);
    const previewBtn = screen.getByLabelText(/preview resistance band set/i);
    previewBtn.focus();
    fireEvent.keyDown(previewBtn, { key: "a", bubbles: true });
    // Mutant this kills: the e.target !== e.currentTarget guard deleted
    // — the bubbled keydown approves from the button.
    expect(fn).not.toHaveBeenCalled();
  });

  it("Space selects the focused row and Shift+A opens the batch confirm", async () => {
    render(<ApprovalsInbox workflows={items} />);
    row("wf1").focus();
    fireEvent.keyDown(row("wf1"), { key: " " });
    expect(screen.getByLabelText(/select resistance band set/i)).toBeChecked();
    fireEvent.keyDown(row("wf1"), { key: "A", shiftKey: true });
    // Mutant this kills: the Space dispatch or the Shift+A branch
    // deleted.
    expect(screen.getByRole("dialog", { name: /confirm batch approve/i })).toHaveAttribute("open");
  });

  it("R opens the reject dialog for the focused row; Enter opens its preview", async () => {
    render(<ApprovalsInbox workflows={items} />);
    row("wf2").focus();
    fireEvent.keyDown(row("wf2"), { key: "r" });
    expect(screen.getByRole("dialog", { name: /reject with reason/i })).toHaveAttribute("open");
    // Mutant this kills: R (or Enter) wired to the wrong row's dialog.
    fireEvent.keyDown(screen.getByRole("dialog", { name: /reject with reason/i }), { key: "Escape" });
    fireEvent.keyDown(row("wf2"), { key: "Enter" });
    expect(screen.getByRole("dialog", { name: /preview item/i })).toHaveAttribute("open");
    expect(screen.getByRole("dialog", { name: /preview item/i }).textContent).toContain("wf2");
  });

  it("no shortcuts while a dialog is open", async () => {
    const fn = stubFetch(() => ok202());
    render(<ApprovalsInbox workflows={items} />);
    row("wf1").focus();
    fireEvent.keyDown(row("wf1"), { key: "Enter" });
    expect(screen.getByRole("dialog", { name: /preview item/i })).toHaveAttribute("open");
    // The preview dialog is open: the rows are inert background — j must
    // not move focus and a must not send.
    fireEvent.keyDown(row("wf1"), { key: "j" });
    expect(document.activeElement).toBe(row("wf1"));
    fireEvent.keyDown(row("wf1"), { key: "a" });
    expect(fn).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole("dialog", { name: /preview item/i }), { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: /preview/i })).toBeNull(),
    );
  });

  it("Space on a focused checkbox toggles ONLY that checkbox (the row handler must not double-toggle)", async () => {
    render(<ApprovalsInbox workflows={items} />);
    const box = screen.getByLabelText(/select resistance band set/i);
    box.focus();
    // jsdom does not implement Space-activates-checkbox, so the test
    // models what a browser does for the keystroke: the keydown bubbles
    // (target=input, NOT the row — the row handler must decline it) and
    // the native activation toggles the input once. Mutant this kills:
    // the e.target !== e.currentTarget guard deleted — the row's Space
    // branch dispatches its own select and untoggles the input.
    fireEvent.keyDown(box, { key: " ", bubbles: true });
    fireEvent.click(box);
    expect(box).toBeChecked();
    expect(screen.getByLabelText(/select yoga mat/i)).not.toBeChecked();
  });

  it("Enter on a focused Approve button never opens the preview (button keys are the button's, not the row's)", async () => {
    const fn = stubFetch(() => ok202());
    render(<ApprovalsInbox workflows={items} />);
    const approveBtn = screen.getByLabelText(/approve resistance band set/i);
    approveBtn.focus();
    fireEvent.keyDown(approveBtn, { key: "Enter", bubbles: true });
    // Mutant this kills: the e.target !== e.currentTarget guard deleted —
    // the row's Enter branch opens the PREVIEW dialog instead of letting
    // the button be a button.
    expect(screen.queryByRole("dialog", { name: /preview item/i })).toBeNull();
    expect(fn).not.toHaveBeenCalled();
  });

  it("the list declares its shortcuts (aria-keyshortcuts)", () => {
    render(<ApprovalsInbox workflows={items} />);
    // Acceptance criterion: the shortcut surface is discoverable by
    // assistive tech. Mutant this kills: the attribute deleted.
    expect(
      screen.getByRole("list", { name: undefined }) ||
        document.querySelector("ul[aria-keyshortcuts]"),
    ).toBeTruthy();
    expect(document.querySelector("ul[aria-keyshortcuts]")).toHaveAttribute(
      "aria-keyshortcuts",
      "j k Enter a r Space Shift+A",
    );
  });

  it("clamps the roving index when the workflows prop shrinks", () => {
    const { rerender } = render(<ApprovalsInbox workflows={items} />);
    fireEvent.focus(row("wf3"));
    expect(row("wf3")).toHaveAttribute("tabindex", "0");
    // A refetch drops wf3: focusIndex 2 is now out of range — the LAST
    // row must hold the single tab stop or Tab leaves the list.
    // Mutant this kills: the Math.min clamp deleted — no row is tabbable.
    rerender(<ApprovalsInbox workflows={items.slice(0, 2)} />);
    expect(row("wf2")).toHaveAttribute("tabindex", "0");
    expect(row("wf1")).toHaveAttribute("tabindex", "-1");
  });

  it("actions refuse decided rows (A and R do nothing on approved)", async () => {
    const fn = stubFetch(() => ok202());
    render(<ApprovalsInbox workflows={items} />);
    await userEvent.click(screen.getByLabelText(/approve resistance band set/i));
    await waitFor(() =>
      expect(screen.getByTestId("item-status-wf1").textContent).toBe("Approved"),
    );
    fireEvent.keyDown(row("wf1"), { key: "a" });
    fireEvent.keyDown(row("wf1"), { key: "r" });
    // Mutant this kills: the reviewable check deleted in the switch —
    // a second POST or a dialog for the decided row appears.
    expect(fn).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("heading", { name: /reject — a reason is required/i })).toBeNull();
  });
});

describe("ApprovalsInbox product join", () => {
  const noTitle = (id: string, productId: string): WorkflowSummary => ({
    ...wf(id, "" as string, "waiting_review"),
    productTitle: undefined,
    productId,
  });

  it("falls back to the joined product title, then the raw product id", () => {
    stubFetch(() => ok202());
    render(
      <ApprovalsInbox
        workflows={[noTitle("wfA", "e8bd-1"), noTitle("wfB", "e8bd-2")]}
        products={{ "e8bd-1": { id: "e8bd-1", title: "Walnut Serving Board", sku: "ENR-P-006" } }}
      />,
    );
    // Mutant this kills: the products prop ignored — the row shows the
    // raw uuid the backend leaves when product_title is absent.
    expect(screen.getByTestId("title-wfA").textContent).toBe("Walnut Serving Board");
    expect(screen.getByTestId("title-wfB").textContent).toBe("e8bd-2");
    cleanup();
  });

  it("the preview drawer shows the draft description from the join", async () => {
    stubFetch(() => ok202());
    render(
      <ApprovalsInbox
        workflows={[noTitle("wfC", "e8bd-3")]}
        products={{ "e8bd-3": { id: "e8bd-3", title: "Walnut Serving Board", sku: "ENR-P-006", description: "Walnut serving board, forty centimetres, oiled and finished by hand." } }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Preview Walnut Serving Board/i }));
    // Mutant this kills: the Draft row dropped — the approver decides
    // without ever seeing the text they are approving.
    expect(screen.getByText(/Walnut serving board, forty centimetres/i)).toBeInTheDocument();
    expect(screen.getByText(/ENR-P-006/)).toBeInTheDocument();
    cleanup();
  });
});
