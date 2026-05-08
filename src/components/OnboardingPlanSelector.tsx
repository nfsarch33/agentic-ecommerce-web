import { SUPPORTED_PLANS } from "@/lib/domain/registration";

export interface OnboardingPlanSelectorProps {
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly id?: string;
}

const PLAN_DESCRIPTIONS: Record<string, string> = {
  free: "Hobby tier. 60 API requests/min, 50 MB storage.",
  starter: "Solo founder tier. 300 req/min, 2 GB storage.",
  pro: "Growing team tier. 1200 req/min, 20 GB storage.",
};

export function OnboardingPlanSelector({ value, onChange, id }: OnboardingPlanSelectorProps) {
  return (
    <fieldset data-testid="onboarding-plan-selector" className="space-y-2">
      <legend className="text-sm font-medium text-slate-700">Choose plan</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {SUPPORTED_PLANS.map((plan) => {
          const checked = value === plan;
          return (
            <label
              key={plan}
              className={[
                "block rounded-md border px-3 py-2 text-sm",
                checked
                  ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
                  : "border-slate-200 bg-white hover:border-slate-400",
              ].join(" ")}
              data-testid={`plan-option-${plan}`}
            >
              <input
                type="radio"
                className="sr-only"
                id={id ? `${id}-${plan}` : undefined}
                name="plan"
                value={plan}
                checked={checked}
                onChange={() => onChange(plan)}
              />
              <span className="block font-semibold capitalize">{plan}</span>
              <span className="text-xs text-slate-600">{PLAN_DESCRIPTIONS[plan] ?? ""}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
