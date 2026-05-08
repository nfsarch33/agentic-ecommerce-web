import {
  RegistrationApiError,
  completeRegistrationOnboarding as adapterComplete,
  type OnboardingResponse,
  type RegistrationOnboardingInput,
} from "@/lib/adapters/api/register";

export type CompleteResult =
  | { readonly ok: true; readonly response: OnboardingResponse }
  | { readonly ok: false; readonly error: string; readonly code?: string };

export interface CompleteDeps {
  readonly impl?: (input: RegistrationOnboardingInput) => Promise<OnboardingResponse>;
}

export async function completeOnboardingUsecase(
  input: RegistrationOnboardingInput,
  deps: CompleteDeps = {},
): Promise<CompleteResult> {
  if (!input.registrationId) {
    return { ok: false, error: "Registration id required", code: "registration_id_required" };
  }
  if (!input.companyName || input.companyName.trim() === "") {
    return { ok: false, error: "Company name required", code: "company_name_required" };
  }
  const fn = deps.impl ?? adapterComplete;
  try {
    return { ok: true, response: await fn(input) };
  } catch (err) {
    if (err instanceof RegistrationApiError) {
      return { ok: false, error: err.message, code: err.code };
    }
    if (err instanceof Error) return { ok: false, error: err.message };
    return { ok: false, error: "unknown error" };
  }
}
