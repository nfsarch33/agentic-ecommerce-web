"use client";

import { useState } from "react";
import { SubscriptionStatusPill } from "@/components/SubscriptionStatusPill";
import type { Subscription } from "@/lib/domain/billing";
import { canCancel, canPause, canResume } from "@/lib/domain/billing";
import {
  cancelSubscriptionUsecase,
  pauseSubscriptionUsecase,
  resumeSubscriptionUsecase,
} from "@/lib/usecases/billing-actions";

export interface BillingDashboardProps {
  readonly baseUrl: string;
  readonly tenantId: string;
  readonly subscriptions: readonly Subscription[];
  readonly error?: string;
}

export function BillingDashboard({ baseUrl, tenantId, subscriptions: initial, error }: BillingDashboardProps) {
  const [subscriptions, setSubscriptions] = useState<readonly Subscription[]>(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  function patch(updated: Subscription): void {
    setSubscriptions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }

  async function runAction(
    sub: Subscription,
    action: "cancel" | "pause" | "resume",
  ): Promise<void> {
    setActionError(null);
    setBusyId(sub.id);
    const opts = { baseUrl, tenantId, id: sub.id };
    const result =
      action === "cancel"
        ? await cancelSubscriptionUsecase(sub, opts)
        : action === "pause"
          ? await pauseSubscriptionUsecase(sub, opts)
          : await resumeSubscriptionUsecase(sub, opts);
    setBusyId(null);
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    patch(result.subscription);
  }

  return (
    <section
      data-testid="billing-dashboard"
      className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
    >
      <header className="flex items-baseline justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Billing subscriptions</h2>
        <a className="text-sm font-medium text-slate-700 underline" href="/admin/billing/invoices">
          View invoices →
        </a>
      </header>
      {error ? (
        <p data-testid="billing-error" className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      ) : null}
      {actionError ? (
        <p data-testid="billing-action-error" className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {actionError}
        </p>
      ) : null}
      {subscriptions.length === 0 ? (
        <p data-testid="billing-empty" className="text-sm text-slate-500">
          No subscriptions yet for this tenant.
        </p>
      ) : (
        <ul className="space-y-3">
          {subscriptions.map((sub) => (
            <li
              key={sub.id}
              data-testid={`subscription-${sub.id}`}
              className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm">{sub.id}</p>
                  <p className="text-xs text-slate-600">Plan: {sub.planId}</p>
                </div>
                <SubscriptionStatusPill state={sub.state} />
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Period: {sub.currentPeriodStart.slice(0, 10)} → {sub.currentPeriodEnd.slice(0, 10)}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  data-testid={`subscription-pause-${sub.id}`}
                  disabled={!canPause(sub.state) || busyId === sub.id}
                  onClick={() => void runAction(sub, "pause")}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                >
                  Pause
                </button>
                <button
                  type="button"
                  data-testid={`subscription-resume-${sub.id}`}
                  disabled={!canResume(sub.state) || busyId === sub.id}
                  onClick={() => void runAction(sub, "resume")}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                >
                  Resume
                </button>
                <button
                  type="button"
                  data-testid={`subscription-cancel-${sub.id}`}
                  disabled={!canCancel(sub.state) || busyId === sub.id}
                  onClick={() => void runAction(sub, "cancel")}
                  className="rounded-md border border-rose-200 bg-white px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-40"
                >
                  Cancel
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
