import {
  RegistrationApiError,
  verifyRegistration as adapterVerify,
  type RegistrationVerifyInput,
} from "@/lib/adapters/api/register";
import type { RegistrationRequest } from "@/lib/domain/registration";

export type VerifyResult =
  | { readonly ok: true; readonly registration: RegistrationRequest }
  | { readonly ok: false; readonly error: string; readonly code?: string };

export interface VerifyDeps {
  readonly impl?: (input: RegistrationVerifyInput) => Promise<RegistrationRequest>;
}

export async function verifyEmailUsecase(
  input: RegistrationVerifyInput,
  deps: VerifyDeps = {},
): Promise<VerifyResult> {
  if (!input.token || input.token.trim() === "") {
    return { ok: false, error: "Verification token required", code: "token_required" };
  }
  const fn = deps.impl ?? adapterVerify;
  try {
    return { ok: true, registration: await fn(input) };
  } catch (err) {
    if (err instanceof RegistrationApiError) {
      return { ok: false, error: err.message, code: err.code };
    }
    if (err instanceof Error) return { ok: false, error: err.message };
    return { ok: false, error: "unknown error" };
  }
}
