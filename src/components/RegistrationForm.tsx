"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingPlanSelector } from "@/components/OnboardingPlanSelector";
import { RegistrationWizardSteps } from "@/components/RegistrationWizardSteps";
import { isValidEmail, isValidSlug } from "@/lib/domain/registration";
import { submitRegistrationUsecase } from "@/lib/usecases/submit-registration";

export interface RegistrationFormProps {
  readonly baseUrl: string;
}

export function RegistrationForm({ baseUrl }: RegistrationFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [slug, setSlug] = useState("");
  const [plan, setPlan] = useState("free");
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationId, setRegistrationId] = useState<string | null>(null);

  const emailValid = isValidEmail(email);
  const slugValid = isValidSlug(slug);
  const formValid = emailValid && slugValid;

  async function handleSubmit(): Promise<void> {
    setError(null);
    setSubmitting(true);
    const result = await submitRegistrationUsecase({
      baseUrl,
      email,
      slugRequested: slug,
      planRequested: plan,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setAccepted(true);
    setRegistrationId(result.response.registration.id);
  }

  function handleContinueOnboarding(): void {
    if (!registrationId) return;
    router.push(`/register/onboarding?registration_id=${encodeURIComponent(registrationId)}`);
  }

  return (
    <section data-testid="registration-form" className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <RegistrationWizardSteps current={accepted ? "pending_email_verification" : "submit"} />
      {!accepted ? (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="register-email"
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
              placeholder="founder@example.com"
              required
            />
            {!emailValid && email !== "" ? (
              <span className="mt-1 block text-xs text-rose-700" data-testid="register-email-error">
                Use a valid email address.
              </span>
            ) : null}
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Tenant slug</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              data-testid="register-slug"
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
              placeholder="acme-corp"
              required
            />
            {!slugValid && slug !== "" ? (
              <span className="mt-1 block text-xs text-rose-700" data-testid="register-slug-error">
                Slug must be kebab-case (lowercase letters, digits, hyphens).
              </span>
            ) : null}
          </label>
          <OnboardingPlanSelector value={plan} onChange={setPlan} id="register-plan" />
          {error ? (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800" data-testid="register-error">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={!formValid || submitting}
            data-testid="register-submit"
            className="inline-flex w-full justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Sign up"}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <p
            data-testid="register-accepted"
            className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
          >
            Check your email <strong>{email}</strong> to verify the address. The link expires
            in 24 hours.
          </p>
          <p className="text-xs text-slate-600">
            Already verified?{" "}
            <button
              type="button"
              onClick={handleContinueOnboarding}
              data-testid="register-continue"
              className="font-medium text-slate-900 underline"
            >
              Continue to onboarding
            </button>
          </p>
        </div>
      )}
    </section>
  );
}
