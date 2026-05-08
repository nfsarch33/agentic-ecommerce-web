"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RegistrationWizardSteps } from "@/components/RegistrationWizardSteps";
import type { RegistrationRequest } from "@/lib/domain/registration";
import { verifyEmailUsecase } from "@/lib/usecases/verify-email";

export interface RegistrationVerifyClientProps {
  readonly baseUrl: string;
}

export function RegistrationVerifyClient({ baseUrl }: RegistrationVerifyClientProps) {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [registration, setRegistration] = useState<RegistrationRequest | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Verification token missing.");
      return;
    }
    let cancelled = false;
    void (async () => {
      const result = await verifyEmailUsecase({ baseUrl, token });
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRegistration(result.registration);
    })();
    return () => {
      cancelled = true;
    };
  }, [baseUrl, token]);

  function handleContinue(): void {
    if (!registration) return;
    router.push(`/register/onboarding?registration_id=${encodeURIComponent(registration.id)}`);
  }

  return (
    <section data-testid="registration-verify" className="space-y-4">
      <RegistrationWizardSteps current={registration?.status ?? "pending_email_verification"} />
      {error ? (
        <p
          data-testid="register-verify-error"
          className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800"
        >
          {error}
        </p>
      ) : null}
      {registration && !error ? (
        <div className="space-y-3" data-testid="register-verify-success">
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Email verified. You can now finish onboarding.
          </p>
          <button
            type="button"
            onClick={handleContinue}
            data-testid="register-verify-continue"
            className="inline-flex rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Continue to onboarding
          </button>
        </div>
      ) : null}
    </section>
  );
}
