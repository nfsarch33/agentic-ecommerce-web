"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OnboardingPlanSelector } from "@/components/OnboardingPlanSelector";
import { RegistrationWizardSteps } from "@/components/RegistrationWizardSteps";
import { completeOnboardingUsecase } from "@/lib/usecases/complete-onboarding";

export interface OnboardingClientProps {
  readonly baseUrl: string;
}

export function OnboardingClient({ baseUrl }: OnboardingClientProps) {
  const router = useRouter();
  const params = useSearchParams();
  const registrationId = params.get("registration_id") ?? "";
  const [companyName, setCompanyName] = useState("");
  const [plan, setPlan] = useState("free");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ readonly tenantId: string; readonly slug: string } | null>(null);

  async function handleSubmit(): Promise<void> {
    setError(null);
    setSubmitting(true);
    const result = await completeOnboardingUsecase({
      baseUrl,
      registrationId,
      companyName,
      plan,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDone({ tenantId: result.response.tenant.id, slug: result.response.tenant.slug });
  }

  if (!registrationId) {
    return (
      <p data-testid="onboarding-missing-id" className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">
        Registration id missing. Re-open the verification link.
      </p>
    );
  }

  return (
    <section data-testid="onboarding-form" className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <RegistrationWizardSteps current={done ? "active" : "onboarding"} />
      {!done ? (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Company name</span>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              data-testid="onboarding-company"
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
              required
            />
          </label>
          <OnboardingPlanSelector value={plan} onChange={setPlan} id="onboarding-plan" />
          {error ? (
            <p data-testid="onboarding-error" className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={submitting || companyName.trim() === ""}
            data-testid="onboarding-submit"
            className="inline-flex w-full justify-center rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? "Provisioning…" : "Provision tenant"}
          </button>
        </form>
      ) : (
        <div className="space-y-3" data-testid="onboarding-success">
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Tenant <strong>{done.slug}</strong> provisioned. Redirecting to admin…
          </p>
          <button
            type="button"
            onClick={() => router.push(`/admin`)}
            data-testid="onboarding-go-admin"
            className="inline-flex rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Go to admin
          </button>
        </div>
      )}
    </section>
  );
}
