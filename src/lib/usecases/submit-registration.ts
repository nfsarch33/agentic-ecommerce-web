import {
  RegistrationApiError,
  submitRegistration as adapterSubmit,
  type RegistrationSubmitInput,
  type SubmitResponse,
} from "@/lib/adapters/api/register";
import { isValidEmail, isValidSlug } from "@/lib/domain/registration";

export type SubmitResult =
  | { readonly ok: true; readonly response: SubmitResponse }
  | { readonly ok: false; readonly error: string; readonly code?: string };

export interface SubmitDeps {
  readonly impl?: (input: RegistrationSubmitInput) => Promise<SubmitResponse>;
}

export async function submitRegistrationUsecase(
  input: RegistrationSubmitInput,
  deps: SubmitDeps = {},
): Promise<SubmitResult> {
  if (!isValidEmail(input.email)) {
    return { ok: false, error: "Email is not valid", code: "email_required" };
  }
  if (!isValidSlug(input.slugRequested)) {
    return { ok: false, error: "Slug must be kebab-case", code: "slug_required" };
  }
  const fn = deps.impl ?? adapterSubmit;
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
