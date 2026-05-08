"use client";
import type { MembershipPlan } from "@/lib/domain/membership";
import { formatMoney } from "@/lib/domain/product";

export interface PlanSelectorProps {
  readonly plans: readonly MembershipPlan[];
  readonly selectedPlanId?: string;
  readonly onSelect: (planId: string) => void;
  readonly disabled?: boolean;
}

export function PlanSelector({ plans, selectedPlanId, onSelect, disabled }: PlanSelectorProps) {
  if (plans.length === 0) {
    return (
      <p className="text-sm text-gray-600" data-testid="plan-selector-empty">
        No membership plans are available yet.
      </p>
    );
  }

  return (
    <fieldset className="grid gap-3" data-testid="plan-selector">
      <legend className="text-sm font-medium text-gray-900">Choose a plan</legend>
      {plans.map((plan) => {
        const id = `plan-${plan.id}`;
        const isSelected = selectedPlanId === plan.id;
        return (
          <label
            key={plan.id}
            htmlFor={id}
            data-testid={`plan-option-${plan.id}`}
            className={[
              "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors",
              isSelected
                ? "border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600/30"
                : "border-gray-200 bg-white hover:border-gray-300",
            ].join(" ")}
          >
            <input
              id={id}
              type="radio"
              name="membership-plan"
              value={plan.id}
              checked={isSelected}
              onChange={() => onSelect(plan.id)}
              disabled={disabled}
              className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="flex-1">
              <span className="flex items-center justify-between">
                <span className="text-base font-semibold text-gray-900">{plan.name}</span>
                <span className="text-sm font-medium text-gray-700">
                  {formatMoney(plan.price)} / {plan.billingCycle === "monthly" ? "mo" : "yr"}
                </span>
              </span>
              {plan.description ? (
                <span className="mt-1 block text-sm text-gray-600">{plan.description}</span>
              ) : null}
              {plan.benefits.length > 0 ? (
                <ul className="mt-2 list-inside list-disc text-sm text-gray-700">
                  {plan.benefits.map((b, idx) => (
                    <li key={`${plan.id}-${idx}`}>{b}</li>
                  ))}
                </ul>
              ) : null}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
