"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { WorkflowSummary } from "@/lib/domain/workflow";
import type { ApprovalProducts } from "@/lib/usecases/approval-products";

export interface ApprovalsInboxProps {
  workflows: WorkflowSummary[];
  /** Server-side product join: the summary API carries no product_title
   * on this backend, so the row label falls back to it before the raw
   * product id, and the preview drawer shows the draft description. */
  products?: ApprovalProducts;
}

/** The component's small palette; one place to retint. */
const TOKENS = {
  textMuted: "#475467",
  border: "#e4e7ec",
  dangerText: "#b42318",
  dangerBg: "#fef3f2",
} as const;

type Decision = "approved" | "rejected";
/** "decided-elsewhere" is terminal like a decision, but arrived as a
 * failure: the item is NOT retryable and must not be offered again. */
type ItemStatus = "pending" | "inflight" | Decision | "failed" | "decided-elsewhere";
/** Why the last attempt failed; drives both the banner and the row. */
type FailKind = "unreachable" | "retryable" | "not-retryable" | "decided-elsewhere" | "sign-in";

interface ItemState {
  status: ItemStatus;
  reason?: string;
  /** Why the last attempt failed — the ROW reads this, so one item's
   * failure can never re-label another item's row via the banner. */
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
  | { type: "fail"; id: string; status: "failed" | "decided-elsewhere"; failKind: FailKind }
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
        items: { ...state.items, [action.id]: { status: action.status, failKind: action.failKind } },
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
    return { kind: "decided-elsewhere", detail: "already decided elsewhere" };
  }
  if (status === 401) {
    return { kind: "sign-in", detail: "your session is no longer valid" };
  }
  if (status >= 500) {
    return { kind: "retryable", detail: `the decision could not be recorded (HTTP ${status})` };
  }
  // 400/415/422 (and any other 4xx): the request was refused as invalid.
  return { kind: "not-retryable", detail: `the API refused the decision as invalid (HTTP ${status})` };
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
      // A retryable failure says retry; every other failure class keeps
      // its own words on the row, so the operator never reads "retry"
      // under a decision that was already made elsewhere or refused.
      return failLabel(item.failKind ?? "retryable");
    case "decided-elsewhere":
      return failLabel("decided-elsewhere");
    case "inflight":
      return "Sending…";
    case "pending":
      return "Pending";
    default:
      return `Unknown item state: ${String(item.status)}`;
  }
}

function failLabel(kind: FailKind): string {
  switch (kind) {
    case "decided-elsewhere":
      return "Decided elsewhere — refresh the queue";
    case "sign-in":
      return "Session expired — sign in again";
    case "not-retryable":
      return "Decision refused as invalid — not recorded";
    case "retryable":
    case "unreachable":
      return "Decision FAILED to record — retry";
    default:
      return `Unknown failure: ${String(kind)}`;
  }
}

function signalPath(id: string): string {
  return `/api/admin/workflows/${encodeURIComponent(id)}/signals/review`;
}

/**
 * The approvals inbox: what agents produced and a person has not yet
 * approved. Approve and reject post SAME-ORIGIN to the BFF route (the
 * session cookie and Idempotency-Key ride along; MC_API_BASE_URL never
 * reaches the browser; the operator identity is attached server-side).
 * Reject REQUIRES a reason (it feeds preference learning) and is never
 * batch; batch-approve confirms count before committing and stops at
 * the first failure, reporting how many selected items were not sent.
 * The cost column shows "—" when the ledger has no number — never a
 * zero. A retryable failure keeps its buttons; a decision recorded
 * elsewhere, an expired session or an invalid request does NOT offer
 * the decision again. An item that is no longer waiting_review is never
 * approvable.
 */
export function ApprovalsInbox({ workflows, products }: ApprovalsInboxProps) {
  // Joined title first (the summary API carries no product_title), then
  // the API's own field, then the raw id — a plain derivation, no hook.
  const productLabel = (wf: WorkflowSummary) =>
    wf.productTitle ?? products?.[wf.productId]?.title ?? wf.productId;
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

  // Synchronous guard: the reducer state is batched, so a second click
  // in the same tick would read a stale closure. `statuses` mirrors the
  // item statuses in a ref and is set to "inflight" BEFORE the await —
  // that single synchronous lock is what makes every entry point (click,
  // batch, dialog submit) refuse double-sends and re-decisions.
  const statusRef = useRef<Record<string, ItemStatus> | null>(null);
  if (statusRef.current === null) {
    statusRef.current = Object.fromEntries(workflows.map((wf) => [wf.id, "pending" as ItemStatus]));
  }
  const statuses = statusRef.current;
  // Live mirror of which item's reject dialog is open: a submit's
  // continuation must compare against CURRENT state, not the value
  // captured when it was clicked.
  const rejectingRef = useRef<string | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const reasonRef = useRef<HTMLTextAreaElement | null>(null);
  const rejectDialogRef = useRef<HTMLDialogElement | null>(null);
  const previewDialogRef = useRef<HTMLDialogElement | null>(null);
  const batchDialogRef = useRef<HTMLDialogElement | null>(null);

  const isReviewable = useCallback(
    (id: string): boolean => {
      const wf = workflows.find((w) => w.id === id);
      if (!wf || wf.status !== "waiting_review") return false;
      const st = statuses[id] ?? "pending";
      return st === "pending" || st === "failed";
    },
    [workflows, statuses],
  );

  // Render-time truth comes from the reducer (recomputes on every
  // decision); the ref above is ONLY the synchronous double-entry
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

  // Roving tabIndex: exactly one row (focusIndex, over the WORKFLOWS
  // list — the single index space) is tabbable; j/k move it. Decided
  // rows keep their position, so an approve on row 1 never shifts what
  // row 2 means.
  const [focusIndex, setFocusIndex] = useState(0);
  const rowRefs = useRef<(HTMLElement | null)[]>([]);
  const focusRow = useCallback(
    (i: number) => {
      const clamped = Math.max(0, Math.min(i, workflows.length - 1));
      setFocusIndex(clamped);
      rowRefs.current[clamped]?.focus();
    },
    [workflows.length],
  );
  const focusNextReviewable = useCallback(
    (afterId: string) => {
      const nextIndex = workflows.findIndex((wf) => reviewableIds.includes(wf.id) && wf.id !== afterId);
      if (nextIndex === -1) return;
      focusRow(nextIndex);
    },
    [focusRow, reviewableIds, workflows],
  );

  const send = useCallback(
    async (id: string, signal: "approve" | "reject", note?: string): Promise<"ok" | "failed" | "refused"> => {
      if (!isReviewable(id)) return "refused";
      statuses[id] = "inflight";
      dispatch({ type: "inflight", id });
      try {
        const res = await fetch(signalPath(id), {
          method: "POST",
          headers: {
            "content-type": "application/json",
            // One key per click: a retried CLICK is a new attempt, a
            // replayed REQUEST is the same decision.
            "idempotency-key": crypto.randomUUID(),
          },
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
            : ({ kind: "unreachable", detail: "the API could not be reached" } as const);
        const terminal: ItemStatus = banner.kind === "decided-elsewhere" ? "decided-elsewhere" : "failed";
        statuses[id] = terminal;
        dispatch({ type: "fail", id, status: terminal, failKind: banner.kind });
        dispatch({ type: "banner", banner });
        return "failed";
      }
    },
    [focusNextReviewable, isReviewable, statuses],
  );

  const captureOpener = useCallback((opener: HTMLElement | null) => {
    openerRef.current = opener;
  }, []);
  const returnFocus = useCallback(() => {
    openerRef.current?.focus();
    openerRef.current = null;
  }, []);

  // Native <dialog>: showModal gives modality, inert background, native
  // Escape and (in browsers) focus return; the effects below just drive
  // open/close from state, and a keydown fallback covers jsdom.

  const closeReject = useCallback((restoreFocus: boolean) => {
    rejectingRef.current = null;
    setRejecting(null);
    if (restoreFocus) returnFocus();
  }, [returnFocus]);
  const closePreview = useCallback(() => {
    setPreview(null);
    returnFocus();
  }, [returnFocus]);
  const closeBatch = useCallback(() => {
    setConfirmBatch(false);
    returnFocus();
  }, [returnFocus]);

  // Native dialog open/close driven from state; written inline (not via
  // a helper) so the refs rule sees each read happen inside its effect.
  useEffect(() => {
    const dialog = rejectDialogRef.current;
    if (!dialog) return;
    if (rejecting && !dialog.open) dialog.showModal();
    if (!rejecting && dialog.open) dialog.close();
  }, [rejecting]);
  useEffect(() => {
    const dialog = previewDialogRef.current;
    if (!dialog) return;
    if (preview && !dialog.open) dialog.showModal();
    if (!preview && dialog.open) dialog.close();
  }, [preview]);
  useEffect(() => {
    const dialog = batchDialogRef.current;
    if (!dialog) return;
    if (confirmBatch && !dialog.open) dialog.showModal();
    if (!confirmBatch && dialog.open) dialog.close();
  }, [confirmBatch]);

  useEffect(() => {
    if (rejecting) reasonRef.current?.focus();
  }, [rejecting]);

  // Keyboard: j/k move · Enter preview · A approve · R reject (reason
  // dialog) · Space select · Shift+A batch approve. The guards ARE the
  // contract: modifier combos and key-repeat never act; keys from a
  // focused BUTTON inside the row (or the dialog textarea) never act
  // (e.target !== e.currentTarget); no shortcuts while a dialog is
  // open; and actions only fire for reviewable rows.
  const onRowKeyDown = (e: React.KeyboardEvent<HTMLElement>, index: number, id: string) => {
    if (rejecting || confirmBatch || preview) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.repeat) return;
    if (e.target !== e.currentTarget) return;
    const reviewable = reviewableIds.includes(id);
    switch (e.key) {
      case "j":
        e.preventDefault();
        focusRow(index + 1);
        break;
      case "k":
        e.preventDefault();
        focusRow(index - 1);
        break;
      case "Enter":
        e.preventDefault();
        captureOpener(e.currentTarget);
        setPreview(id);
        break;
      case "a":
        if (!reviewable) return;
        e.preventDefault();
        void send(id, "approve");
        break;
      case "A":
        if (!e.shiftKey || selectedIds.length === 0) return;
        e.preventDefault();
        captureOpener(e.currentTarget);
        setConfirmBatch(true);
        break;
      case "r":
        if (!reviewable) return;
        e.preventDefault();
        captureOpener(e.currentTarget);
        rejectingRef.current = id;
        setRejecting(id);
        setReason("");
        setReasonError(null);
        break;
      case " ":
        if (!reviewable) return;
        e.preventDefault();
        dispatch({ type: "select", id, on: !state.selected[id] });
        break;
    }
  };

  if (workflows.length === 0) {
    return (
      <section aria-label="Approvals empty" style={{ padding: "1.5rem" }}>
        <h1>Approvals</h1>
        <p>Nothing waits on you. When agents produce work a customer would
        see, it appears here for your OK.</p>
      </section>
    );
  }

  const submitReject = async () => {
    const id = rejecting;
    if (!id) return;
    const note = reason.trim();
    if (note.length < 3) {
      setReasonError("Write a reason (at least 3 characters).");
      return;
    }
    // send() refuses when the item is in flight or already decided; a
    // failure keeps the dialog open with the typed reason.
    const result = await send(id, "reject", note);
    // Stale continuation guard: if the operator moved to a DIFFERENT
    // item's dialog while this request was in flight, this result must
    // not close that dialog or touch its reason. rejectingRef holds the
    // LIVE dialog item — the closure's `rejecting` is frozen at click.
    if (rejectingRef.current !== id) return;
    if (result === "ok") {
      closeReject(false); // focus already moved to the next item
      setReasonError(null);
    } else if (result === "refused") {
      // The item became undecidable while the dialog was open (decided
      // elsewhere, already in flight): say so instead of a silent no-op.
      setReasonError("This item can no longer be decided here — refresh the queue.");
    }
  };

  // No batch-level lock on purpose: every entry point funnels through
  // send(), whose synchronous per-item status mirror refuses a second
  // send of the same item — a double click re-runs the loop but every
  // item is still sent exactly once (proven by the double-click test).
  const runBatch = async () => {
    setConfirmBatch(false);
    // Stop at the FIRST failure: the operator must see which decision
    // was dropped instead of losing it in a stream — and how many of
    // the selection were never sent.
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
  };

  return (
    <section aria-label="Approvals inbox" style={{ padding: "1rem", minWidth: 0 }} data-testid="approvals-inbox">
      <h1>Approvals</h1>
      <p style={{ color: TOKENS.textMuted }}>
        Keyboard: j/k move · Enter preview · A approve · R reject · Space
        select · Shift+A batch approve
      </p>
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
        <button
          onClick={(e) => {
            captureOpener(e.currentTarget);
            setConfirmBatch(true);
          }}
          disabled={selectedIds.length === 0}
        >
          Approve {selectedIds.length} selected…
        </button>
        <span aria-live="polite" data-testid="pending-count">
          {reviewableIds.length} pending
        </span>
      </div>
      <ul
        style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.5rem", minWidth: 0 }}
        aria-keyshortcuts="j k Enter a r Space Shift+A"
      >
        {workflows.map((wf, i) => {
          const item: ItemState = state.items[wf.id] ?? { status: "pending" };
          const reviewable =
            wf.status === "waiting_review" && (item.status === "pending" || item.status === "failed");
          const showButtons = reviewable || item.status === "inflight";
          return (
            <li
              key={wf.id}
              data-status={item.status}
              data-row-id={wf.id}
              aria-label={`Approval item ${productLabel(wf)}`}
              tabIndex={i === Math.min(focusIndex, workflows.length - 1) ? 0 : -1}
              ref={(el) => {
                rowRefs.current[i] = el;
              }}
              onKeyDown={(e) => onRowKeyDown(e, i, wf.id)}
              // Click-focus must sync the roving index too, or Tab leaves
              // the list at row 0 instead of the last-used row.
              onFocus={() => setFocusIndex(i)}
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
                  aria-label={`Select ${productLabel(wf)}`}
                  checked={!!state.selected[wf.id]}
                  disabled={!reviewable}
                  onChange={(e) => dispatch({ type: "select", id: wf.id, on: e.target.checked })}
                />
                <strong style={{ overflowWrap: "anywhere" }}>{wf.type}</strong>
                <span
                  style={{ overflowWrap: "anywhere", minWidth: 0, flex: "1 1 12rem" }}
                  data-testid={`title-${wf.id}`}
                >
                  {productLabel(wf)}
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
                      aria-label={`Approve ${productLabel(wf)}`}
                      data-approve-id={wf.id}
                    >
                      Approve
                    </button>
                    <button
                      onClick={(e) => {
                        captureOpener(e.currentTarget);
                        rejectingRef.current = wf.id;
                        setRejecting(wf.id);
                        setReason("");
                        setReasonError(null);
                      }}
                      disabled={item.status === "inflight"}
                      aria-label={`Reject ${productLabel(wf)}`}
                      data-reject-id={wf.id}
                    >
                      Reject…
                    </button>
                  </>
                )}
                <button
                  onClick={(e) => {
                    captureOpener(e.currentTarget);
                    setPreview(wf.id);
                  }}
                  aria-label={`Preview ${productLabel(wf)}`}
                >
                  Preview
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <dialog
        ref={previewDialogRef}
        aria-label="Preview item"
        onKeyDown={(e) => {
          if (e.key === "Escape") closePreview();
        }}
        style={{ border: `1px solid ${TOKENS.border}`, borderRadius: "8px" }}
      >
        {preview && (
          <>
            <h2>Preview</h2>
            {(() => {
              const wf = workflows.find((w) => w.id === preview);
              if (!wf) return null;
              return (
                <dl style={{ overflowWrap: "anywhere" }}>
                  <dt>Workflow</dt><dd>{wf.id}</dd>
                  <dt>Type</dt><dd>{wf.type}</dd>
                  <dt>Product</dt><dd>{productLabel(wf)}{products?.[wf.productId]?.sku ? ` (${products[wf.productId]?.sku})` : ""}</dd>
                  <dt>Current description</dt>
                  <dd data-testid={`current-description-${wf.id}`}>
                    {products?.[wf.productId]?.description ?? "— no description on the product record —"}
                    <span style={{ display: "block", color: TOKENS.textMuted }}>
                      the store record as it is now — the workflow overwrites it only after approval; the draft text itself appears here once the workflow API exposes it
                    </span>
                  </dd>
                  <dt>Status</dt><dd>{workflowStatusLabel(wf.status)}</dd>
                  <dt>Current activity</dt><dd>{wf.currentActivity ?? "—"}</dd>
                  <dt>Started</dt><dd>{wf.startedAt}</dd>
                  <dt>Updated</dt><dd>{wf.updatedAt}</dd>
                </dl>
              );
            })()}
            <button onClick={closePreview}>Close preview</button>
          </>
        )}
      </dialog>

      <dialog
        ref={rejectDialogRef}
        aria-label="Reject with reason"
        onKeyDown={(e) => {
          if (e.key === "Escape") closeReject(true);
        }}
        style={{ border: `1px solid ${TOKENS.border}`, borderRadius: "8px" }}
      >
        {rejecting && (
          <>
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
                The decision could not be recorded — the reason is kept; try again.
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
          </>
        )}
      </dialog>

      <dialog
        ref={batchDialogRef}
        aria-label="Confirm batch approve"
        onKeyDown={(e) => {
          if (e.key === "Escape") closeBatch();
        }}
        style={{ border: `1px solid ${TOKENS.border}`, borderRadius: "8px" }}
      >
        {confirmBatch && (
          <>
            <h2>Approve {selectedIds.length} items?</h2>
            <p data-testid="batch-cost-summary">
              You are approving {selectedIds.length} item
              {selectedIds.length === 1 ? "" : "s"} a customer would see. Cost:
              — per item (the run ledger is not wired yet; a dash, never a
              zero). Reject is never batch — one wrong reject teaches the
              wrong preference at scale.
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={() => void runBatch()}
                data-testid="batch-confirm"
              >
                Approve all {selectedIds.length}
              </button>
              <button onClick={closeBatch}>Cancel</button>
            </div>
          </>
        )}
      </dialog>
    </section>
  );
}
