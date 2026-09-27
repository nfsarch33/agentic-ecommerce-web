"use client";

import { useCallback, useMemo, useReducer, useState } from "react";
import type { WorkflowSummary } from "@/lib/domain/workflow";

export interface ApprovalsInboxProps {
  workflows: WorkflowSummary[];
  error?: string;
}

type Decision = "approved" | "rejected";

interface ItemState {
  status: "pending" | Decision | "needs_review" | "failed";
  reason?: string;
}

interface State {
  items: Record<string, ItemState>;
  selected: Record<string, boolean>;
  busy: boolean;
  fetchedAt: string;
  offline: boolean;
}

type Action =
  | { type: "decide"; id: string; decision: Decision; reason?: string }
  | { type: "needs_review"; id: string }
  | { type: "fail"; id: string }
  | { type: "select"; id: string; on: boolean }
  | { type: "select_all"; on: boolean }
  | { type: "busy"; on: boolean }
  | { type: "offline"; on: boolean };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "decide":
      return {
        ...state,
        items: {
          ...state.items,
          [action.id]: { status: action.decision, reason: action.reason },
        },
        // A decided item leaves the selection.
        selected: { ...state.selected, [action.id]: false },
      };
    case "needs_review":
      return {
        ...state,
        items: { ...state.items, [action.id]: { status: "needs_review" } },
      };
    case "fail":
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
    case "offline":
      return { ...state, offline: action.on };
  }
}

/**
 * The approvals inbox: what agents produced and a person has not yet
 * approved. Approve sends the review signal; reject REQUIRES a reason
 * (the reason teaches the agent's preference learning) and is never
 * batch; batch-approve confirms count before committing. The cost column
 * shows "—" when the ledger has no number — never a zero.
 */
export function ApprovalsInbox({ workflows, error }: ApprovalsInboxProps) {
  const [state, dispatch] = useReducer(reducer, {
    items: Object.fromEntries(
      workflows.map((wf) => [wf.id, { status: "pending" as const }]),
    ),
    selected: {},
    busy: false,
    fetchedAt: new Date().toISOString(),
    offline: false,
  });
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [confirmBatch, setConfirmBatch] = useState(false);

  const pendingIds = useMemo(
    () =>
      workflows
        .filter((wf) => state.items[wf.id]?.status === "pending")
        .map((wf) => wf.id),
    [workflows, state.items],
  );
  const selectedIds = pendingIds.filter((id) => state.selected[id]);

  const sendSignal = useCallback(
    async (id: string, approved: boolean, note?: string) => {
      dispatch({ type: "busy", on: true });
      try {
        const baseUrl = process.env.NEXT_PUBLIC_MC_API_BASE_URL ?? "";
        const res = await fetch(
          `${baseUrl}/api/v1/workflows/${id}/signals/review`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ approved, note }),
          },
        );
        if (!res.ok) throw new Error(`review signal failed: ${res.status}`);
        dispatch({
          type: "decide",
          id,
          decision: approved ? "approved" : "rejected",
          reason: note,
        });
        dispatch({ type: "offline", on: false });
      } catch {
        dispatch({ type: "offline", on: true });
      } finally {
        dispatch({ type: "busy", on: false });
      }
    },
    [],
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

  return (
    <section aria-label="Approvals inbox" style={{ padding: "1rem", minWidth: 0 }}>
      <h1>Approvals</h1>
      {state.offline && (
        <p role="alert" data-testid="stale-banner">
          A decision could not be recorded — the API is unreachable. The
          queue below may be stale (fetched{" "}
          {new Date(state.fetchedAt).toLocaleTimeString()}); nothing was
          lost, retry the item.
        </p>
      )}
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
        <button
          onClick={() => dispatch({ type: "select_all", on: selectedIds.length < pendingIds.length })}
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
        {workflows.map((wf) => {
          const item = state.items[wf.id] ?? { status: "pending" as const };
          return (
            <li
              key={wf.id}
              style={{
                border: "1px solid #e4e7ec",
                borderRadius: "8px",
                padding: "0.75rem",
                display: "grid",
                gap: "0.5rem",
                minWidth: 0,
              }}
              data-status={item.status}
              aria-label={`Approval item ${wf.productTitle ?? wf.productId}`}
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
                <span style={{ overflowWrap: "anywhere", minWidth: 0, flex: "1 1 12rem" }}>
                  {wf.productTitle ?? wf.productId}
                </span>
                <span aria-label="Cost" title="Run cost from the ledger; dash means not available">
                  cost&nbsp;—
                </span>
                <time dateTime={wf.updatedAt}>
                  {new Date(wf.updatedAt).toLocaleDateString()}
                </time>
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
                      onClick={() => sendSignal(wf.id, true)}
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
                    <button onClick={() => dispatch({ type: "needs_review", id: wf.id })}>
                      Needs review later
                    </button>
                  </>
                ) : (
                  <span data-testid={`item-status-${wf.id}`}>
                    {item.status === "rejected"
                      ? `Rejected: ${item.reason}`
                      : item.status === "needs_review"
                        ? "Marked for later review"
                        : item.status === "failed"
                          ? "Decision failed — retry"
                          : "Approved"}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {rejecting && (
        <div role="dialog" aria-label="Reject with reason" style={{ border: "1px solid #e4e7ec", padding: "1rem", borderRadius: "8px", marginTop: "1rem" }}>
          <h2>Reject — a reason is required</h2>
          <p style={{ color: "#475467" }}>The reason feeds the agent&rsquo;s
          preference learning; a reject without one teaches nothing.</p>
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
          {reasonError && (
            <p role="alert" style={{ color: "#b42318" }}>{reasonError}</p>
          )}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => {
                if (reason.trim().length < 3) {
                  setReasonError("Write a reason (at least 3 characters).");
                  return;
                }
                sendSignal(rejecting, false, reason.trim());
                setRejecting(null);
              }}
            >
              Reject with this reason
            </button>
            <button onClick={() => setRejecting(null)}>Cancel</button>
          </div>
        </div>
      )}

      {confirmBatch && (
        <div role="dialog" aria-label="Confirm batch approve" style={{ border: "1px solid #e4e7ec", padding: "1rem", borderRadius: "8px", marginTop: "1rem" }}>
          <h2>Approve {selectedIds.length} items?</h2>
          <p>You are approving {selectedIds.length} item
          {selectedIds.length === 1 ? "" : "s"} a customer would see. Reject
          is never batch — one wrong reject teaches the wrong preference at
          scale.</p>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={async () => {
                setConfirmBatch(false);
                for (const id of selectedIds) {
                  await sendSignal(id, true);
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
