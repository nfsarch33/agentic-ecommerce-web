"use client";
import { useState } from "react";
import type { MembershipPlan, Subscription } from "@/lib/domain/membership";
import { availableActions } from "@/lib/domain/membership";
import { formatMoney } from "@/lib/domain/product";
import { MembershipStatusPill } from "./MembershipStatusPill";
import { MembershipActions, type MembershipAction } from "./MembershipActions";
import { PlanSelector } from "./PlanSelector";
import {
  cancelMembershipUsecase,
  IllegalMembershipTransitionError,
} from "@/lib/usecases/cancel-membership";
import { pauseMembershipUsecase } from "@/lib/usecases/pause-membership";
import { resumeMembershipUsecase } from "@/lib/usecases/resume-membership";

export interface CustomerMembershipPanelProps {
  readonly plans: readonly MembershipPlan[];
  readonly membership?: Subscription;
  readonly tenantId: string;
  readonly baseUrl: string;
}

export function CustomerMembershipPanel({
  plans,
  membership: initial,
  tenantId,
  baseUrl,
}: CustomerMembershipPanelProps) {
  const [membership, setMembership] = useState<Subscription | undefined>(initial);
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>(plans[0]?.id);
  const [busy, setBusy] = useState<MembershipAction | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  const dispatchAction = async (action: MembershipAction) => {
    if (!membership) return;
    setBusy(action);
    setError(undefined);
    const deps = { baseUrl, tenantId };
    try {
      let updated: Subscription;
      switch (action) {
        case "pause":
          updated = await pauseMembershipUsecase({ membership }, deps);
          break;
        case "resume":
          updated = await resumeMembershipUsecase({ membership }, deps);
          break;
        case "cancel":
          updated = await cancelMembershipUsecase({ membership }, deps);
          break;
      }
      setMembership(updated);
    } catch (err) {
      setError(
        err instanceof IllegalMembershipTransitionError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Action failed",
      );
    } finally {
      setBusy(undefined);
    }
  };

  if (membership) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12" data-testid="customer-membership-panel">
        <header className="mb-8">
          <p className="text-sm font-medium uppercase tracking-wide text-gray-500">My account</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">My membership</h1>
        </header>
        <article className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{membership.plan.name}</h2>
              <p className="mt-1 text-sm text-gray-600">
                {formatMoney(membership.plan.price)} /{" "}
                {membership.plan.billingCycle === "monthly" ? "month" : "year"}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Period {new Date(membership.currentPeriodStart).toLocaleDateString("en-AU")} →{" "}
                {new Date(membership.currentPeriodEnd).toLocaleDateString("en-AU")}
              </p>
            </div>
            <MembershipStatusPill state={membership.state} />
          </div>
          <div className="mt-5">
            <MembershipActions
              membership={membership}
              onAction={(a) => void dispatchAction(a)}
              busyAction={busy}
            />
          </div>
          {error && (
            <p
              role="alert"
              data-testid="customer-membership-error"
              className="mt-3 text-sm text-rose-700"
            >
              {error}
            </p>
          )}
          {availableActions(membership.state).length === 0 && (
            <p className="mt-4 text-sm text-gray-600">
              Your membership is in a final state. You can rejoin by selecting a new plan below.
            </p>
          )}
        </article>
      </main>
    );
  }

  // No active membership - show plan selector + Stripe checkout stub.
  return (
    <main className="mx-auto max-w-3xl px-6 py-12" data-testid="customer-membership-panel">
      <header className="mb-8">
        <p className="text-sm font-medium uppercase tracking-wide text-gray-500">My account</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Join the membership</h1>
        <p className="mt-2 text-sm text-gray-600">
          Pick a plan to continue. Stripe checkout will open in a new tab once we wire up the
          payment gateway in v2.5.0; this preview captures the plan id you would purchase.
        </p>
      </header>
      <PlanSelector
        plans={plans}
        selectedPlanId={selectedPlanId}
        onSelect={setSelectedPlanId}
      />
      <button
        type="button"
        disabled={!selectedPlanId}
        data-testid="customer-membership-checkout"
        className="mt-6 inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
      >
        Continue to Stripe checkout
      </button>
    </main>
  );
}
