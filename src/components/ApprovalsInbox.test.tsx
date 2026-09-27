import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
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

const items = [
  wf("wf1", "Resistance Band Set"),
  wf("wf2", "Yoga Mat"),
  wf("wf3", "Foam Roller"),
];

const httpFailSpy = (status: number) =>
  vi.fn().mockRejectedValue(new Error(`sendWorkflowReviewSignal: HTTP ${status}`));

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 200 })));
});
afterEach(() => {
  vi.unstubAllGlobals();
  cleanup();
});

/** focus the inbox container so keyboard events land (jsdom has no
 * real focus roving; fireEvent targets the section). */
function inbox() {
  return screen.getByTestId("approvals-inbox");
}

describe("ApprovalsInbox — the blocker", () => {
  it("a FAILED signal is per-item sticky: a later success on another item does not clear it", async () => {
    // Fail wf1, then succeed wf2: wf1 must still show FAILED and the
    // banner must persist.
    let calls = 0;
    const impl = vi.fn().mockImplementation(({ workflowId }: { workflowId: string }) => {
      calls += 1;
      if (workflowId === "wf1") throw new Error("sendWorkflowReviewSignal: network error");
      return Promise.resolve({});
    });
    render(<ApprovalsInbox workflows={items} sendSignalImpl={impl} />);
    await userEvent.click(screen.getByLabelText(/approve resistance band set/i));
    await waitFor(() =>
      expect(screen.getByTestId("item-status-wf1").textContent).toContain("FAILED"),
    );
    expect(screen.getByTestId("stale-banner").textContent).toContain("could not be reached");
    // Now succeed on a DIFFERENT item.
    await userEvent.click(screen.getByLabelText(/approve yoga mat/i));
    await waitFor(() =>
      expect(screen.getByTestId("item-status-wf2").textContent).toBe("Approved"),
    );
    // Mutant this kills: `dispatch({type:"fail",id})` deleted, or the
    // banner cleared on every success.
    expect(screen.getByTestId("item-status-wf1").textContent).toContain("FAILED");
    expect(screen.getByTestId("stale-banner")).toBeTruthy();
    // Dismiss is the only thing that clears the banner.
    await userEvent.click(screen.getByText(/dismiss/i));
    expect(screen.queryByTestId("stale-banner")).toBeNull();
    expect(screen.getByTestId("item-status-wf1").textContent).toContain("FAILED");
  });

  it("classifies an HTTP refusal distinctly from unreachable", async () => {
    render(<ApprovalsInbox workflows={items} sendSignalImpl={httpFailSpy(409)} />);
    await userEvent.click(screen.getByLabelText(/approve resistance band set/i));
    await waitFor(() =>
      expect(screen.getByTestId("stale-banner").textContent).toContain("HTTP 409"),
    );
  });

  it("batch approve STOPS at the first failure and keeps the dropped item visible", async () => {
    const impl = vi.fn().mockImplementation(({ workflowId }: { workflowId: string }) => {
      if (workflowId === "wf2") throw new Error("sendWorkflowReviewSignal: HTTP 503");
      return Promise.resolve({});
    });
    render(<ApprovalsInbox workflows={items} sendSignalImpl={impl} />);
    await userEvent.click(screen.getByLabelText(/select yoga mat/i));
    await userEvent.click(screen.getByLabelText(/select foam roller/i));
    await userEvent.click(screen.getByText(/approve 2 selected…/i));
    await userEvent.click(screen.getByText(/approve all 2/i));
    await waitFor(() =>
      expect(screen.getByTestId("item-status-wf2").textContent).toContain("FAILED"),
    );
    // Stop at the first failure: the sibling was never sent, so it stays
    // PENDING (its buttons still visible) — not silently consumed.
    expect(screen.queryByTestId("item-status-wf3")).toBeNull();
    expect(
      screen.getByLabelText(/approve foam roller/i),
    ).toBeTruthy();
    expect(impl).toHaveBeenCalledTimes(1);
  });
});

describe("ApprovalsInbox — contract", () => {
  it("approve sends the adapter contract: approve signal with the baseUrl", async () => {
    const impl = vi.fn().mockResolvedValue({});
    render(<ApprovalsInbox workflows={items} baseUrl="http://api.test" sendSignalImpl={impl} />);
    await userEvent.click(screen.getByLabelText(/approve resistance band set/i));
    await waitFor(() => expect(impl).toHaveBeenCalled());
    // Mutant this kills: baseUrl dropped from the call.
    expect(impl).toHaveBeenCalledWith({
      baseUrl: "http://api.test",
      workflowId: "wf1",
      signal: "approve",
      note: undefined,
    });
  });

  it("reject posts the generated-schema body {approved:false, note} through the REAL adapter", async () => {
    // This exercises sendWorkflowReviewSignal itself against a real local
    // HTTP server — the client POST path outside the bun mock — and
    // parses the request body bytes. The beforeEach fetch stub must NOT
    // intercept this one.
    vi.unstubAllGlobals();
    const http = await import("node:http");
    let captured: { url: string; method: string; body: any; contentType: string } | null = null;
    const server = http.createServer((req, res) => {
      let raw = "";
      req.on("data", (chunk) => (raw += chunk));
      req.on("end", () => {
        captured = {
          url: req.url ?? "",
          method: req.method ?? "",
          body: JSON.parse(raw || "{}"),
          contentType: req.headers["content-type"] ?? "",
        };
        res.writeHead(202, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            status: "signaled",
            workflow: {
              id: "wf2", type: "product_publish", status: "completed", product_id: "p1",
              product_title: "Yoga Mat", current_activity: "Published",
              started_at: "2026-09-25T00:00:00Z", updated_at: "2026-09-25T01:00:00Z",
              completed_at: "2026-09-25T01:00:00Z",
              activities: [], review: { approved: false, reviewer: "op", note: "wrong size chart" },
            },
          }),
        );
      });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = (server.address() as { port: number }).port;
    try {
      render(<ApprovalsInbox workflows={items} baseUrl={`http://127.0.0.1:${port}`} />);
      await userEvent.click(screen.getByLabelText(/reject yoga mat/i));
      await userEvent.type(screen.getByLabelText(/rejection reason/i), "wrong size chart");
      await userEvent.click(screen.getByText(/reject with this reason/i));
      await waitFor(() => {
        // Surface the real adapter error when this regresses.
        const banner = screen.queryByTestId("stale-banner");
        if (banner) throw new Error(`adapter rejected the stub: ${banner.textContent}`);
        expect(screen.getByTestId("item-status-wf2").textContent).toContain("wrong size chart");
      });
      // Mutant this kills: hand-typed payload with a wrong field name
      // (e.g. {approved, text}) — the parsed body would not match the
      // generated schema.
      expect(captured!.url).toBe("/api/v1/workflows/wf2/signals/review");
      expect(captured!.method).toBe("POST");
      expect(captured!.contentType).toContain("application/json");
      expect(captured!.body).toEqual({ approved: false, note: "wrong size chart" });
    } finally {
      server.close();
    }
  });

  it("empty queue is a success state, not a blank", () => {
    render(<ApprovalsInbox workflows={[]} />);
    expect(screen.getByText(/nothing waits on you/i)).toBeTruthy();
  });

  it("reject requires a reason: empty reason is blocked", async () => {
    const impl = vi.fn().mockResolvedValue({});
    render(<ApprovalsInbox workflows={items} sendSignalImpl={impl} />);
    await userEvent.click(screen.getByLabelText(/reject yoga mat/i));
    await userEvent.click(screen.getByText(/reject with this reason/i));
    expect(screen.getByRole("alert").textContent).toContain("at least 3 characters");
    expect(impl).not.toHaveBeenCalled();
  });

  it("the cost column renders a dash, never a zero", () => {
    render(<ApprovalsInbox workflows={items} />);
    const costs = screen.getAllByLabelText(/cost/i);
    expect(costs.length).toBe(3);
    for (const c of costs) expect(c.textContent).toContain("—");
    expect(document.body.textContent).not.toContain("cost 0");
  });
});

describe("ApprovalsInbox — keyboard path", () => {
  it("j/k move focus, A approves the focused item", async () => {
    const impl = vi.fn().mockResolvedValue({});
    render(<ApprovalsInbox workflows={items} sendSignalImpl={impl} />);
    fireEvent.keyDown(inbox(), { key: "j" }); // wf1 -> wf2
    fireEvent.keyDown(inbox(), { key: "a" });
    await waitFor(() => expect(impl).toHaveBeenCalled());
    // Mutant this kills: focusIndex not wired to the action (a always
    // acts on item 0).
    expect(impl).toHaveBeenCalledWith(expect.objectContaining({ workflowId: "wf2" }));
  });

  it("R opens the reason dialog for the focused item; Space selects it", async () => {
    const impl = vi.fn().mockResolvedValue({});
    render(<ApprovalsInbox workflows={items} sendSignalImpl={impl} />);
    fireEvent.keyDown(inbox(), { key: "j" }); // focus wf2
    fireEvent.keyDown(inbox(), { key: " " }); // select wf2
    expect(screen.getByLabelText(/select yoga mat/i)).toBeChecked();
    fireEvent.keyDown(inbox(), { key: "r" }); // reject wf2
    expect(screen.getByRole("dialog", { name: /reject with reason/i })).toBeTruthy();
    await userEvent.type(screen.getByLabelText(/rejection reason/i), "bad");
    await userEvent.click(screen.getByText(/reject with this reason/i));
    await waitFor(() => expect(impl).toHaveBeenCalledWith(expect.objectContaining({ signal: "reject", note: "bad" })));
  });

  it("Enter opens the preview dialog with the full workflow", () => {
    render(<ApprovalsInbox workflows={items} />);
    fireEvent.keyDown(inbox(), { key: "Enter" });
    const dialog = screen.getByRole("dialog", { name: /preview item/i });
    expect(dialog.textContent).toContain("wf1");
    expect(dialog.textContent).toContain("drafted listing");
  });

  it("Shift+A opens the batch confirmation for the selection", async () => {
    const impl = vi.fn().mockResolvedValue({});
    render(<ApprovalsInbox workflows={items} sendSignalImpl={impl} />);
    await userEvent.click(screen.getByLabelText(/select yoga mat/i));
    fireEvent.keyDown(inbox(), { key: "A", shiftKey: true });
    const dialog = screen.getByRole("dialog", { name: /confirm batch approve/i });
    // Cost summary is part of the confirmation text.
    expect(dialog.textContent).toContain("Cost:");
    expect(dialog.textContent).toContain("—");
  });
});
