"use client";
import { useState } from "react";
import type { MembershipPlan } from "@/lib/domain/membership";
import { canAccessRole, type Role } from "@/lib/domain/auth";
import { formatMoney } from "@/lib/domain/product";

export interface MembershipPlanManagementProps {
  readonly initialPlans: readonly MembershipPlan[];
  readonly userRole: Role;
}

export function MembershipPlanManagement({ initialPlans, userRole }: MembershipPlanManagementProps) {
  const canMutate = canAccessRole(userRole, "operator");
  const [plans] = useState<readonly MembershipPlan[]>(initialPlans);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-gray-500">Admin</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Membership Plans</h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-600">
            Plans expose the storefront pricing and benefits offered to subscribers. Use the
            backend API to mutate these plans; this view is read-first for v2.2.0.
          </p>
        </div>
        {canMutate ? (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
            Operator access
          </span>
        ) : (
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
            View-only access
          </span>
        )}
      </header>

      {plans.length === 0 ? (
        <p
          data-testid="membership-plans-empty"
          className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-600"
        >
          No membership plans yet. Create one via{" "}
          <code className="rounded bg-gray-100 px-1 py-0.5">POST /api/v1/membership-plans</code>.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2" data-testid="membership-plans-grid">
          {plans.map((plan) => (
            <article
              key={plan.id}
              data-testid={`membership-plan-${plan.id}`}
              className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
            >
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{plan.name}</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    {formatMoney(plan.price)} / {plan.billingCycle === "monthly" ? "month" : "year"}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                  {plan.billingCycle}
                </span>
              </header>
              {plan.description && (
                <p className="mt-3 text-sm text-gray-700">{plan.description}</p>
              )}
              {plan.benefits.length > 0 && (
                <ul className="mt-4 list-inside list-disc text-sm text-gray-700">
                  {plan.benefits.map((b, idx) => (
                    <li key={`${plan.id}-${idx}`}>{b}</li>
                  ))}
                </ul>
              )}
              <p className="mt-4 text-xs text-gray-500">
                Plan ID <code className="rounded bg-gray-100 px-1">{plan.id}</code>
                {plan.stripePriceId && (
                  <>
                    {" "}
                    · Stripe <code className="rounded bg-gray-100 px-1">{plan.stripePriceId}</code>
                  </>
                )}
              </p>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
