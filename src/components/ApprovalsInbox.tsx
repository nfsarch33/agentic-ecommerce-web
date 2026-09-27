"use client";

import { useCallback, useMemo, useReducer, useState } from "react";
import type { WorkflowSummary } from "@/lib/domain/workflow";
import { sendReviewSignalForWorkflow } from "@/lib/usecases/workflows";

export interface ApprovalsInboxProps {
  workflows: WorkflowSummary[];
  error?: string;
  /** API base the review signals post to (the server page passes its
   * MC_API_BASE_URL; the client never invents one). */
  baseUrl?: string;
  /** Seam: tests inject a spy; production posts through the generated-
   * schema adapter (ProductPublishReviewSignal: approved, note, reviewer). */
  sendSignalImpl?: (input: {
    baseUrl?: string;
    workflowId: string;
    signal: "approve" | "reject";
    note?: string;
  }) => Promise<unknown>;
}

type Decision = "approved" | "rejected";

interface ItemState {
  status: "pending" | Decision | "failed";
  reason?: string;
}

interface State {
  items: Record<string, ItemState>;
  selected: Record<string, boolean>;
  busy: boolean;
  /** Sticky: set on a failed decision, cleared ONLY by the dismiss
   * button — a later success must never erase a dropped decision. */
  banner: { kind: "unreachable" | "rejected-api"; detail: string } | null;
}

type Action =
  | { type: "decide"; id: string; decision: Decision; reason?: string }
  | { type: "fail"; id: string }
  | { type: "select"; id: string; on: boolean }
  | { type: "select_all"; on: boolean }
  | { type: "busy"; on: boolean }
  | { type: "banner"; banner: State["banner"] }
  | { type: "dismiss_banner" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "decide":
      return {
        ...state,
        items: {
          ...state.items,
          [action.id]: { status: action.decision, reason: action.reason },
        },
        selected: { ...state.selected, [action.id]: false },
      };
    case "fail":
      // The item's failure is per-item AND sticky in the banner: the
      // operator's dropped decision stays visible until dismissed.
      return {
        ...state,
        items: { ...state.items, [action.id]: { status: "failed" } },
      };
    case "select":
      return { ...state, selected: { ...state.selected, [action.id]: action.on } };
    case "select_all": {
      const selected: Record<string, boolean> = {};
      for (const id of Object.keys(state.items)) selected[id] = action.on;
      return { ...state, selected };
    }
    case "busy":
      return { ...state, busy: action.on };
    case "banner":
      return { ...state, banner: action.banner };
    case "dismiss_banner":
      return { ...state, banner: null };
  }
}

function classifyError(err: unknown): State["banner"] {
  const message = err instanceof Error ? err.message : String(err);
  // The adapter distinguishes the two failure families: a network error
  // means the API was unreachable; an HTTP status means the API saw the
  // request and refused it (404 unknown workflow, 409 conflict...).
  if (/network error/i.test(message)) {
    return { kind: "unreachable", detail: "the API could not be reached" };
  }
  const status = message.match(/HTTP (\d+)/)?.[1];
  return {
    kind: "rejected-api",
    detail: status ? `the API rejected the decision (HTTP ${status})` : message,
  };
}

/**
 * The approvals inbox: what agents produced and a person has not yet
 * approved. Approve and reject post the decided review contract through
 * the generated-schema adapter; reject REQUIRES a reason (it feeds
 * preference learning) and is never batch; batch-approve confirms count
 * before committing. The cost column shows "—" when the ledger has no
 * number — never a zero. A failed decision is per-item sticky AND raises
 * a banner only the operator dismisses.
 *
 * Keyboard: j/k move · Enter preview · A approve · R reject (reason
 * dialog) · Space select · Shift+A batch approve.
 */
export function ApprovalsInbox({ workflows, error, baseUrl, sendSignalImpl }: ApprovalsInboxProps) {
  const [state, dispatch] = useReducer(reducer, {
    items: Object.fromEntries(
      workflows.map((wf) => [wf.id, { status: "pending" as const }]),
    ),
    selected: {},
    busy: false,
    banner: null,
  });
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [confirmBatch, setConfirmBatch] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);

  const pendingIds = useMemo(
    () =>
      workflows
        .filter((wf) => state.items[wf.id]?.status === "pending")
        .map((wf) => wf.id),
    [workflows, state.items],
  );
  const selectedIds = pendingIds.filter((id) => state.selected[id]);

  const send = useCallback(
    async (id: string, signal: "approve" | "reject", note?: string) => {
      dispatch({ type: "busy", on: true });
      try {
        if (sendSignalImpl) {
          await sendSignalImpl({ baseUrl, workflowId: id, signal, note });
        } else {
          if (!baseUrl) {
            // The adapter throws a confusing error without a base URL;
            // fail here with the real cause instead.
            throw new Error("approvals: API base URL is required to send decisions");
          }
          await sendReviewSignalForWorkflow({ baseUrl, workflowId: id, signal, note });
        }
        dispatch({
          type: "decide",
          id,
          decision: signal === "approve" ? "approved" : "rejected",
          reason: note,
        });
        return true;
      } catch (err) {
        // BOTH effects matter: the item keeps its failed state (the
        // decision was dropped) and the banner is set for everyone.
        dispatch({ type: "fail", id });
        dispatch({ type: "banner", banner: classifyError(err) });
        return false;
      } finally {
        dispatch({ type: "busy", on: false });
      }
    },
    [baseUrl, sendSignalImpl],
  );

  if (error) {
    return (
      <section aria-label="Approvals error" style={{ padding: "1rem" }}>
        <p role="alert">Could not load the approvals queue: {error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </section>
    );
  }

  if (workflows.length === 0) {
    return (
      <section aria-label="Approvals empty" style={{ padding: "1.5rem" }}>
        <h1>Approvals</h1>
        <p>Nothing waits on you. When agents produce work a customer would
        see, it appears here for your OK.</p>
      </section>
    );
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (rejecting || confirmBatch || preview) return;
    const focusedPending = pendingIds[focusIndex];
    if (e.key === "j") {
      e.preventDefault();
      setFocusIndex((i) => Math.min(i + 1, workflows.length - 1));
    } else if (e.key === "k") {
      e.preventDefault();
      setFocusIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      setPreview(workflows[focusIndex]?.id ?? null);
    } else if (e.key === "a" || e.key === "A") {
      e.preventDefault();
      if (e.shiftKey) {
        if (selectedIds.length > 0) setConfirmBatch(true);
      } else {
        if (focusedPending) void send(focusedPending, "approve");
      }
    } else if (e.key === "r") {
      e.preventDefault();
      if (focusedPending) {
        setRejecting(focusedPending);
        setReason("");
        setReasonError(null);
      }
    } else if (e.key === " ") {
      e.preventDefault();
      if (focusedPending) {
        dispatch({ type: "select", id: focusedPending, on: !state.selected[focusedPending] });
      }
    }
  };

  return (
    <section
      aria-label="Approvals inbox"
      tabIndex={0}
      onKeyDown={onKeyDown}
      style={{ padding: "1rem", minWidth: 0, outline: "none" }}
      data-testid="approvals-inbox"
    >
      <h1>Approvals</h1>
      <p style={{ color: "#475467" }}>
        Keyboard: j/k move · Enter preview · A approve · R reject · Space
        select · Shift+A batch approve
      </p>
      {state.banner && (
        <p
          role="alert"
          data-testid="stale-banner"
          style={{ background: "#fef3f2", padding: "0.5rem", borderRadius: "6px" }}
        >
          A decision could not be recorded — {state.banner.detail}. The item
          is marked failed; retry it.{" "}
          <button onClick={() => dispatch({ type: "dismiss_banner" })}>Dismiss</button>
        </p>
      )}
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
        <button
          onClick={() =>
            dispatch({ type: "select_all", on: selectedIds.length < pendingIds.length })
          }
          aria-pressed={selectedIds.length === pendingIds.length && pendingIds.length > 0}
        >
          {selectedIds.length === pendingIds.length ? "Clear selection" : "Select all pending"}
        </button>
        <button
          onClick={() => setConfirmBatch(true)}
          disabled={selectedIds.length === 0 || state.busy}
        >
          Approve {selectedIds.length} selected…
        </button>
        <span aria-live="polite" data-testid="pending-count">
          {pendingIds.length} pending
        </span>
      </div>
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.5rem", minWidth: 0 }}>
        {workflows.map((wf, i) => {
          const item = state.items[wf.id] ?? { status: "pending" as const };
          const focused = i === focusIndex;
          return (
            <li
              key={wf.id}
              data-status={item.status}
              data-focused={focused}
              aria-label={`Approval item ${wf.productTitle ?? wf.productId}`}
              style={{
                border: focused ? "2px solid #b45309" : "1px solid #e4e7ec",
                borderRadius: "8px",
                padding: "0.75rem",
                display: "grid",
                gap: "0.5rem",
                minWidth: 0,
              }}
            >
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline", flexWrap: "wrap", minWidth: 0 }}>
                <input
                  type="checkbox"
                  aria-label={`Select ${wf.productTitle ?? wf.id}`}
                  checked={!!state.selected[wf.id]}
                  disabled={item.status !== "pending"}
                  onChange={(e) => dispatch({ type: "select", id: wf.id, on: e.target.checked })}
                />
                <strong style={{ overflowWrap: "anywhere" }}>{wf.type}</strong>
                <span
                  style={{ overflowWrap: "anywhere", minWidth: 0, flex: "1 1 12rem" }}
                  data-testid={`title-${wf.id}`}
                >
                  {wf.productTitle ?? wf.productId}
                </span>
                <span aria-label="Cost" title="Run cost from the ledger; dash means not available">
                  cost&nbsp;—
                </span>
                <time dateTime={wf.updatedAt}>{new Date(wf.updatedAt).toLocaleDateString()}</time>
              </div>
              {wf.currentActivity && (
                <p style={{ color: "#475467", margin: 0, overflowWrap: "anywhere" }}>
                  {wf.currentActivity}
                </p>
              )}
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {item.status === "pending" ? (
                  <>
                    <button
                      onClick={() => void send(wf.id, "approve")}
                      disabled={state.busy}
                      aria-label={`Approve ${wf.productTitle ?? wf.id}`}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        setRejecting(wf.id);
                        setReason("");
                        setReasonError(null);
                      }}
                      disabled={state.busy}
                      aria-label={`Reject ${wf.productTitle ?? wf.id}`}
                    >
                      Reject…
                    </button>
                    <button onClick={() => setPreview(wf.id)} aria-label={`Preview ${wf.productTitle ?? wf.id}`}>
                      Preview
                    </button>
                  </>
                ) : (
                  <span data-testid={`item-status-${wf.id}`}>
                    {item.status === "rejected"
                      ? `Rejected: ${item.reason}`
                      : item.status === "failed"
                        ? "Decision FAILED to record — retry"
                        : "Approved"}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {preview && (
        <div
          role="dialog"
          aria-label="Preview item"
          style={{ border: "1px solid #e4e7ec", padding: "1rem", borderRadius: "8px", marginTop: "1rem" }}
        >
          <h2>Preview</h2>
          {(() => {
            const wf = workflows.find((w) => w.id === preview);
            if (!wf) return null;
            return (
              <dl style={{ overflowWrap: "anywhere" }}>
                <dt>Workflow</dt><dd>{wf.id}</dd>
                <dt>Type</dt><dd>{wf.type}</dd>
                <dt>Product</dt><dd>{wf.productTitle ?? wf.productId}</dd>
                <dt>Current activity</dt><dd>{wf.currentActivity ?? "—"}</dd>
                <dt>Started</dt><dd>{wf.startedAt}</dd>
                <dt>Updated</dt><dd>{wf.updatedAt}</dd>
              </dl>
            );
          })()}
          <button onClick={() => setPreview(null)}>Close preview</button>
        </div>
      )}

      {rejecting && (
        <div
          role="dialog"
          aria-label="Reject with reason"
          style={{ border: "1px solid #e4e7ec", padding: "1rem", borderRadius: "8px", marginTop: "1rem" }}
        >
          <h2>Reject — a reason is required</h2>
          <p style={{ color: "#475467" }}>
            The reason feeds the agent&rsquo;s preference learning; a reject
            without one teaches nothing.
          </p>
          <label>
            Reason
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              style={{ width: "100%" }}
              aria-label="Rejection reason"
            />
          </label>
          {reasonError && <p role="alert" style={{ color: "#b42318" }}>{reasonError}</p>}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => {
                if (reason.trim().length < 3) {
                  setReasonError("Write a reason (at least 3 characters).");
                  return;
                }
                const id = rejecting;
                setRejecting(null);
                void send(id, "reject", reason.trim());
              }}
            >
              Reject with this reason
            </button>
            <button onClick={() => setRejecting(null)}>Cancel</button>
          </div>
        </div>
      )}

      {confirmBatch && (
        <div
          role="dialog"
          aria-label="Confirm batch approve"
          style={{ border: "1px solid #e4e7ec", padding: "1rem", borderRadius: "8px", marginTop: "1rem" }}
        >
          <h2>Approve {selectedIds.length} items?</h2>
          <p>
            You are approving {selectedIds.length} item
            {selectedIds.length === 1 ? "" : "s"} a customer would see. Cost:
            — per item (the run ledger is not wired yet; a dash, never a
            zero). Reject is never batch — one wrong reject teaches the
            wrong preference at scale.
          </p>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={async () => {
                setConfirmBatch(false);
                // Stop at the FIRST failure: the operator must see which
                // decision was dropped instead of losing it in a stream.
                for (const id of selectedIds) {
                  const ok = await send(id, "approve");
                  if (!ok) break;
                }
              }}
            >
              Approve all {selectedIds.length}
            </button>
            <button onClick={() => setConfirmBatch(false)}>Cancel</button>
          </div>
        </div>
      )}
    </section>
  );
}
