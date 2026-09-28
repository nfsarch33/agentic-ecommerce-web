"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { WorkflowSummary } from "@/lib/domain/workflow";

export interface ApprovalsInboxProps {
  workflows: WorkflowSummary[];
}

/** The component's small palette; one place to retint. */
const TOKENS = {
  textMuted: "#475467",
  border: "#e4e7ec",
  borderFocused: "#b45309",
  dangerText: "#b42318",
  dangerBg: "#fef3f2",
} as const;

type Decision = "approved" | "rejected";
type ItemStatus = "pending" | "inflight" | Decision | "failed";
type FailKind = "unreachable" | "retryable" | "rejected-api" | "decided-elsewhere";

interface ItemState {
  status: ItemStatus;
  reason?: string;
  /** Why the last attempt failed, for in-dialog retry advice. */
  failKind?: FailKind;
}

interface Banner {
  kind: FailKind;
  detail: string;
}

interface State {
  items: Record<string, ItemState>;
  selected: Record<string, boolean>;
  /** Sticky: set on a failed decision, cleared ONLY by the dismiss
   * button — a later success must never erase a dropped decision. */
  banner: Banner | null;
  /** How many batch-selected items were NOT sent after a batch stopped
   * at its first failure. */
  notSent?: number;
}

type Action =
  | { type: "inflight"; id: string }
  | { type: "decide"; id: string; decision: Decision; reason?: string }
  | { type: "fail"; id: string; failKind: FailKind }
  | { type: "select"; id: string; on: boolean }
  | { type: "select_all"; on: boolean }
  | { type: "banner"; banner: Banner }
  | { type: "batch_stopped"; notSent: number }
  | { type: "dismiss_banner" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "inflight":
      return { ...state, items: { ...state.items, [action.id]: { status: "inflight" } } };
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
        items: { ...state.items, [action.id]: { status: "failed", failKind: action.failKind } },
      };
    case "select":
      return { ...state, selected: { ...state.selected, [action.id]: action.on } };
    case "select_all": {
      const selected: Record<string, boolean> = {};
      for (const id of Object.keys(state.items)) selected[id] = action.on;
      return { ...state, selected };
    }
    case "banner":
      return { ...state, banner: action.banner };
    case "batch_stopped":
      return { ...state, notSent: action.notSent };
    case "dismiss_banner":
      return { ...state, banner: null, notSent: undefined };
  }
}

/** Thrown by send() when the same-origin route answered with an error
 * status; classification reads the code, never a message. */
class SignalHttpError extends Error {
  readonly status: number;
  constructor(status: number) {
    super(`review signal HTTP ${status}`);
    this.status = status;
  }
}

function classifyStatus(status: number): Banner {
  if (status === 404 || status === 409) {
    return {
      kind: "decided-elsewhere",
      detail: "this decision was already recorded elsewhere — refresh the queue to see its current state",
    };
  }
  if (status >= 500) {
    return { kind: "retryable", detail: `the decision could not be recorded (HTTP ${status})` };
  }
  return { kind: "rejected-api", detail: `the API rejected the decision (HTTP ${status})` };
}

/** Exhaustive over the workflow vocabulary; the default renders the raw
 * value so an unknown status can never masquerade as a decision. */
function workflowStatusLabel(status: WorkflowSummary["status"]): string {
  switch (status) {
    case "queued":
      return "Queued";
    case "running":
      return "Running";
    case "waiting_review":
      return "Waiting for your review";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    default:
      return `Unknown status: ${String(status)}`;
  }
}

/** Exhaustive over the item states; no "Approved" catch-all. */
function itemStatusLabel(item: ItemState): string {
  switch (item.status) {
    case "approved":
      return "Approved";
    case "rejected":
      return `Rejected: ${item.reason ?? ""}`;
    case "failed":
      return "Decision FAILED to record — retry";
    case "inflight":
      return "Sending…";
    case "pending":
      return "Pending";
    default:
      return `Unknown item state: ${String(item.status)}`;
  }
}

function signalPath(id: string): string {
  return `/api/admin/workflows/${encodeURIComponent(id)}/signals/review`;
}

/**
 * The approvals inbox: what agents produced and a person has not yet
 * approved. Approve and reject post SAME-ORIGIN to the BFF route
 * (the session cookie rides along; MC_API_BASE_URL never reaches the
 * browser). Reject REQUIRES a reason (it feeds preference learning) and
 * is never batch; batch-approve confirms count before committing and
 * stops at the first failure, reporting how many selected items were
 * not sent. The cost column shows "—" when the ledger has no number —
 * never a zero. A failed decision keeps its buttons (retry stays
 * possible), is per-item sticky, and raises a banner only the operator
 * dismisses; a 404/409 means decided elsewhere, so it says refresh, not
 * retry. An item that is no longer waiting_review is never approvable.
 */
export function ApprovalsInbox({ workflows }: ApprovalsInboxProps) {
  const [state, dispatch] = useReducer(reducer, {
    items: Object.fromEntries(workflows.map((wf) => [wf.id, { status: "pending" as const }])),
    selected: {},
    banner: null,
  });
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [confirmBatch, setConfirmBatch] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  // Synchronous guards: the reducer state is batched, so a second click
  // in the same tick would read a stale closure. The refs are the
  // per-item in-flight lock (B2) and a mirror of terminal statuses so
  // every entry point refuses to re-decide a decided item.
  const inflightRef = useRef<Set<string>>(new Set());
  const statusRef = useRef<Record<string, ItemStatus> | null>(null);
  if (statusRef.current === null) {
    statusRef.current = Object.fromEntries(workflows.map((wf) => [wf.id, "pending" as ItemStatus]));
  }
  const statuses = statusRef.current;
  const openerRef = useRef<HTMLElement | null>(null);
  const reasonRef = useRef<HTMLTextAreaElement | null>(null);
  const previewCloseRef = useRef<HTMLButtonElement | null>(null);
  const batchPrimaryRef = useRef<HTMLButtonElement | null>(null);

  const isReviewable = useCallback(
    (id: string): boolean => {
      const wf = workflows.find((w) => w.id === id);
      if (!wf || wf.status !== "waiting_review") return false;
      const st = statuses[id] ?? "pending";
      return st === "pending" || st === "failed";
    },
    // `statuses` aliases the ref-backed map; stable for the component's
    // lifetime, so it is safe as a dependency.
    [workflows, statuses],
  );

  // Render-time truth comes from the reducer (recomputes on every
  // decision); the refs above are ONLY the synchronous double-entry
  // guard used inside send().
  const reviewableIds = useMemo(
    () =>
      workflows
        .filter((wf) => {
          if (wf.status !== "waiting_review") return false;
          const st = state.items[wf.id]?.status ?? "pending";
          return st === "pending" || st === "failed";
        })
        .map((wf) => wf.id),
    [workflows, state.items],
  );
  const selectedIds = reviewableIds.filter((id) => state.selected[id]);

  const focusNextReviewable = useCallback(
    (afterId: string) => {
      const next = reviewableIds.find((id) => id !== afterId);
      if (!next) return;
      document
        .querySelector<HTMLElement>(`[data-approve-id="${CSS.escape(next)}"]`)
        ?.focus();
    },
    [reviewableIds],
  );

  const send = useCallback(
    async (id: string, signal: "approve" | "reject", note?: string): Promise<"ok" | "failed" | "refused"> => {
      if (inflightRef.current.has(id)) return "refused";
      if (!isReviewable(id)) return "refused";
      inflightRef.current.add(id);
      statuses[id] = "inflight";
      dispatch({ type: "inflight", id });
      try {
        const res = await fetch(signalPath(id), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(note ? { signal, note } : { signal }),
        });
        if (!res.ok) throw new SignalHttpError(res.status);
        const decision: Decision = signal === "approve" ? "approved" : "rejected";
        statuses[id] = decision;
        dispatch({ type: "decide", id, decision, reason: note });
        focusNextReviewable(id);
        return "ok";
      } catch (err) {
        const banner =
          err instanceof SignalHttpError
            ? classifyStatus(err.status)
            : { kind: "unreachable" as const, detail: "the API could not be reached" };
        statuses[id] = "failed";
        dispatch({ type: "fail", id, failKind: banner.kind });
        dispatch({ type: "banner", banner });
        return "failed";
      } finally {
        inflightRef.current.delete(id);
      }
    },
    [focusNextReviewable, isReviewable, statuses],
  );

  const captureOpener = useCallback(() => {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }, []);
  const returnFocus = useCallback(() => {
    openerRef.current?.focus();
    openerRef.current = null;
  }, []);

  useEffect(() => {
    if (rejecting) reasonRef.current?.focus();
  }, [rejecting]);
  useEffect(() => {
    if (preview) previewCloseRef.current?.focus();
  }, [preview]);
  useEffect(() => {
    if (confirmBatch) batchPrimaryRef.current?.focus();
  }, [confirmBatch]);

  if (workflows.length === 0) {
    return (
      <section aria-label="Approvals empty" style={{ padding: "1.5rem" }}>
        <h1>Approvals</h1>
        <p>Nothing waits on you. When agents produce work a customer would
        see, it appears here for your OK.</p>
      </section>
    );
  }

  const closeReject = (restoreFocus: boolean) => {
    setRejecting(null);
    if (restoreFocus) returnFocus();
  };

  const submitReject = async () => {
    const note = reason.trim();
    if (note.length < 3) {
      setReasonError("Write a reason (at least 3 characters).");
      return;
    }
    // send() refuses when the item is in flight or already decided; on
    // failure the dialog STAYS OPEN with the typed reason (B1).
    const result = await send(rejecting ?? "", "reject", note);
    if (result === "ok") {
      closeReject(false); // focus already moved to the next item
      setReasonError(null);
    }
  };

  return (
    <section
      aria-label="Approvals inbox"
      style={{ padding: "1rem", minWidth: 0 }}
      data-testid="approvals-inbox"
    >
      <h1>Approvals</h1>
      {state.banner && (
        <p
          role="alert"
          data-testid="stale-banner"
          style={{ background: TOKENS.dangerBg, padding: "0.5rem", borderRadius: "6px" }}
        >
          A decision could not be recorded — {state.banner.detail}.{" "}
          {state.banner.kind === "retryable" || state.banner.kind === "unreachable"
            ? "The item is marked failed; retry it."
            : ""}{" "}
          {state.banner.kind === "decided-elsewhere" && (
            <button onClick={() => window.location.reload()}>Refresh queue</button>
          )}{" "}
          {state.notSent !== undefined && state.notSent > 0 && (
            <span data-testid="batch-not-sent">
              {state.notSent} selected item{state.notSent === 1 ? " was" : "s were"} not sent.
            </span>
          )}{" "}
          <button onClick={() => dispatch({ type: "dismiss_banner" })}>Dismiss</button>
        </p>
      )}
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
        <button
          onClick={() =>
            dispatch({ type: "select_all", on: selectedIds.length < reviewableIds.length })
          }
          aria-pressed={selectedIds.length === reviewableIds.length && reviewableIds.length > 0}
        >
          {selectedIds.length === reviewableIds.length ? "Clear selection" : "Select all pending"}
        </button>
        <button onClick={() => { captureOpener(); setConfirmBatch(true); }} disabled={selectedIds.length === 0}>
          Approve {selectedIds.length} selected…
        </button>
        <span aria-live="polite" data-testid="pending-count">
          {reviewableIds.length} pending
        </span>
      </div>
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.5rem", minWidth: 0 }}>
        {workflows.map((wf) => {
          const item: ItemState = state.items[wf.id] ?? { status: "pending" };
          const reviewable =
            wf.status === "waiting_review" && (item.status === "pending" || item.status === "failed");
          const showButtons = reviewable || item.status === "inflight";
          return (
            <li
              key={wf.id}
              data-status={item.status}
              aria-label={`Approval item ${wf.productTitle ?? wf.productId}`}
              style={{
                border: `1px solid ${TOKENS.border}`,
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
                  disabled={!reviewable}
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
                <time dateTime={wf.updatedAt}>
                  {new Date(wf.updatedAt).toLocaleDateString("en-AU", { timeZone: "Australia/Sydney" })}
                </time>
              </div>
              {wf.currentActivity && (
                <p style={{ color: TOKENS.textMuted, margin: 0, overflowWrap: "anywhere" }}>
                  {wf.currentActivity}
                </p>
              )}
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                {item.status !== "pending" && (
                  <span data-testid={`item-status-${wf.id}`}>{itemStatusLabel(item)}</span>
                )}
                {item.status === "pending" && wf.status !== "waiting_review" && (
                  <span data-testid={`item-status-${wf.id}`}>{workflowStatusLabel(wf.status)}</span>
                )}
                {showButtons && (
                  <>
                    <button
                      onClick={() => void send(wf.id, "approve")}
                      disabled={item.status === "inflight"}
                      aria-label={`Approve ${wf.productTitle ?? wf.id}`}
                      data-approve-id={wf.id}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        captureOpener();
                        setRejecting(wf.id);
                        setReason("");
                        setReasonError(null);
                      }}
                      disabled={item.status === "inflight"}
                      aria-label={`Reject ${wf.productTitle ?? wf.id}`}
                      data-reject-id={wf.id}
                    >
                      Reject…
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    captureOpener();
                    setPreview(wf.id);
                  }}
                  aria-label={`Preview ${wf.productTitle ?? wf.id}`}
                >
                  Preview
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {preview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Preview item"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setPreview(null);
              returnFocus();
            }
          }}
          style={{ border: `1px solid ${TOKENS.border}`, padding: "1rem", borderRadius: "8px", marginTop: "1rem" }}
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
                <dt>Status</dt><dd>{workflowStatusLabel(wf.status)}</dd>
                <dt>Current activity</dt><dd>{wf.currentActivity ?? "—"}</dd>
                <dt>Started</dt><dd>{wf.startedAt}</dd>
                <dt>Updated</dt><dd>{wf.updatedAt}</dd>
              </dl>
            );
          })()}
          <button
            ref={previewCloseRef}
            onClick={() => {
              setPreview(null);
              returnFocus();
            }}
          >
            Close preview
          </button>
        </div>
      )}

      {rejecting && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Reject with reason"
          onKeyDown={(e) => {
            if (e.key === "Escape") closeReject(true);
          }}
          style={{ border: `1px solid ${TOKENS.border}`, padding: "1rem", borderRadius: "8px", marginTop: "1rem" }}
        >
          <h2>Reject — a reason is required</h2>
          <p style={{ color: TOKENS.textMuted }}>
            The reason feeds the agent&rsquo;s preference learning; a reject
            without one teaches nothing.
          </p>
          <label>
            Reason
            <textarea
              ref={reasonRef}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              style={{ width: "100%" }}
              aria-label="Rejection reason"
            />
          </label>
          {reasonError && <p role="alert" style={{ color: TOKENS.dangerText }}>{reasonError}</p>}
          {state.items[rejecting]?.status === "failed" && (
            <p role="alert" style={{ color: TOKENS.dangerText }} data-testid="reject-fail-note">
              {state.items[rejecting]?.failKind === "decided-elsewhere"
                ? "This item was already decided elsewhere — refresh the queue. The reason is kept."
                : "The decision could not be recorded — the reason is kept; try again."}
            </p>
          )}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => void submitReject()}
              disabled={state.items[rejecting]?.status === "inflight"}
            >
              Reject with this reason
            </button>
            <button onClick={() => closeReject(true)}>Cancel</button>
          </div>
        </div>
      )}

      {confirmBatch && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm batch approve"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setConfirmBatch(false);
              returnFocus();
            }
          }}
          style={{ border: `1px solid ${TOKENS.border}`, padding: "1rem", borderRadius: "8px", marginTop: "1rem" }}
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
              ref={batchPrimaryRef}
              onClick={async () => {
                setConfirmBatch(false);
                // Stop at the FIRST failure: the operator must see which
                // decision was dropped instead of losing it in a stream —
                // and how many of the selection were never sent.
                const batchIds = [...selectedIds];
                let sent = 0;
                for (const id of batchIds) {
                  const result = await send(id, "approve");
                  if (result === "ok") {
                    sent += 1;
                    continue;
                  }
                  if (result === "failed") {
                    dispatch({ type: "batch_stopped", notSent: batchIds.length - sent - 1 });
                    break;
                  }
                }
              }}
            >
              Approve all {selectedIds.length}
            </button>
            <button
              onClick={() => {
                setConfirmBatch(false);
                returnFocus();
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
