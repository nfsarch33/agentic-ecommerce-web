import type { RegistrationStatus } from "@/lib/domain/registration";
import { REGISTRATION_WIZARD_STEPS, statusRank } from "@/lib/domain/registration";

export interface RegistrationWizardStepsProps {
  readonly current: RegistrationStatus | "submit";
}

export function RegistrationWizardSteps({ current }: RegistrationWizardStepsProps) {
  const currentRank =
    current === "submit" ? -1 : statusRank(current);
  return (
    <ol
      data-testid="registration-wizard-steps"
      className="flex flex-wrap items-center gap-3 text-sm"
    >
      {REGISTRATION_WIZARD_STEPS.map((step, idx) => {
        const isComplete = step.id !== "submit" && statusRank(step.id) <= currentRank;
        const isCurrent = step.id === current;
        const tone = isCurrent
          ? "font-semibold text-slate-900"
          : isComplete
            ? "text-emerald-700"
            : "text-slate-500";
        return (
          <li
            key={step.id}
            className={tone}
            data-testid={`registration-step-${step.id}`}
            data-state={isCurrent ? "current" : isComplete ? "complete" : "pending"}
          >
            <span className="text-xs uppercase tracking-wider">Step {idx + 1}</span>
            <span className="block">{step.label}</span>
            <span className="block text-xs text-slate-500">{step.description}</span>
          </li>
        );
      })}
    </ol>
  );
}
