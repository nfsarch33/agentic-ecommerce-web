// HTTP adapter for /register*. Public, no JWT; rate-limited.
import type { RegistrationRequest, RegistrationStatus } from "@/lib/domain/registration";
import { isRegistrationStatus } from "@/lib/domain/registration";

export class RegistrationApiError extends Error {
  override readonly name = "RegistrationApiError";
  override readonly cause?: unknown;
  readonly status?: number;
  readonly code?: string;
  constructor(message: string, status?: number, code?: string, cause?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.cause = cause;
  }
}

export interface RegistrationApiBase {
  readonly baseUrl: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface RegistrationSubmitInput extends RegistrationApiBase {
  readonly email: string;
  readonly slugRequested: string;
  readonly planRequested?: string;
}

export interface RegistrationVerifyInput extends RegistrationApiBase {
  readonly token: string;
}

export interface RegistrationOnboardingInput extends RegistrationApiBase {
  readonly registrationId: string;
  readonly companyName: string;
  readonly plan?: string;
}

export interface SubmitResponse {
  readonly registration: RegistrationRequest;
  readonly message: string;
}

export interface OnboardingResponse {
  readonly registration: RegistrationRequest;
  readonly tenant: {
    readonly id: string;
    readonly slug: string;
    readonly name: string;
    readonly plan: string;
    readonly status: string;
    readonly createdAt: string;
    readonly updatedAt: string;
  };
}

interface RawRegistration {
  readonly id?: unknown;
  readonly email?: unknown;
  readonly slug_requested?: unknown;
  readonly plan_requested?: unknown;
  readonly status?: unknown;
  readonly tenant_id?: unknown;
  readonly company_name?: unknown;
}

interface RawTenant {
  readonly id?: unknown;
  readonly slug?: unknown;
  readonly name?: unknown;
  readonly plan?: unknown;
  readonly status?: unknown;
  readonly created_at?: unknown;
  readonly updated_at?: unknown;
}

function asString(value: unknown, label: string): string {
  if (typeof value !== "string" || value === "") {
    throw new RegistrationApiError(`${label} must be a non-empty string`);
  }
  return value;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

export function parseRegistration(raw: unknown): RegistrationRequest {
  const value = raw as RawRegistration;
  const status = asString(value?.status, "registration.status");
  if (!isRegistrationStatus(status)) {
    throw new RegistrationApiError(`registration.status invalid: ${status}`);
  }
  const typed: RegistrationStatus = status;
  return {
    id: asString(value?.id, "registration.id"),
    email: asString(value?.email, "registration.email"),
    slugRequested: asString(value?.slug_requested, "registration.slug_requested"),
    planRequested: asString(value?.plan_requested, "registration.plan_requested"),
    status: typed,
    tenantId: asOptionalString(value?.tenant_id),
    companyName: asOptionalString(value?.company_name),
  };
}

function parseTenant(raw: unknown): OnboardingResponse["tenant"] {
  const value = raw as RawTenant;
  return {
    id: asString(value?.id, "tenant.id"),
    slug: asString(value?.slug, "tenant.slug"),
    name: asString(value?.name, "tenant.name"),
    plan: asString(value?.plan, "tenant.plan"),
    status: asString(value?.status, "tenant.status"),
    createdAt: asString(value?.created_at, "tenant.created_at"),
    updatedAt: asString(value?.updated_at, "tenant.updated_at"),
  };
}

async function postJSON(
  url: string,
  body: unknown,
  opts: RegistrationApiBase,
  label: string,
): Promise<{ readonly status: number; readonly raw: unknown }> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: opts.signal,
    });
  } catch (err) {
    throw new RegistrationApiError(`${label}: network error`, undefined, undefined, err);
  }
  let raw: unknown = null;
  try {
    raw = await res.json();
  } catch (err) {
    if (!res.ok) {
      throw new RegistrationApiError(`${label}: HTTP ${res.status}`, res.status, undefined, err);
    }
  }
  if (!res.ok) {
    const code = typeof (raw as { error?: unknown })?.error === "string"
      ? ((raw as { error: string }).error)
      : undefined;
    throw new RegistrationApiError(`${label}: HTTP ${res.status}`, res.status, code);
  }
  return { status: res.status, raw };
}

export async function submitRegistration(input: RegistrationSubmitInput): Promise<SubmitResponse> {
  if (!input.baseUrl) throw new RegistrationApiError("submitRegistration: baseUrl required");
  const url = `${input.baseUrl}/register`;
  const { raw } = await postJSON(
    url,
    {
      email: input.email,
      slug_requested: input.slugRequested,
      plan_requested: input.planRequested ?? "free",
    },
    input,
    "submitRegistration",
  );
  const value = raw as { registration?: unknown; message?: unknown };
  return {
    registration: parseRegistration(value?.registration),
    message:
      typeof value?.message === "string" && value.message !== ""
        ? value.message
        : "Check your email to verify the address.",
  };
}

export async function verifyRegistration(
  input: RegistrationVerifyInput,
): Promise<RegistrationRequest> {
  if (!input.baseUrl) throw new RegistrationApiError("verifyRegistration: baseUrl required");
  const url = `${input.baseUrl}/register/verify`;
  const { raw } = await postJSON(url, { token: input.token }, input, "verifyRegistration");
  return parseRegistration(raw);
}

export async function completeRegistrationOnboarding(
  input: RegistrationOnboardingInput,
): Promise<OnboardingResponse> {
  if (!input.baseUrl) throw new RegistrationApiError("completeRegistrationOnboarding: baseUrl required");
  const url = `${input.baseUrl}/register/onboarding`;
  const { raw } = await postJSON(
    url,
    {
      registration_id: input.registrationId,
      company_name: input.companyName,
      plan: input.plan,
    },
    input,
    "completeRegistrationOnboarding",
  );
  const value = raw as { registration?: unknown; tenant?: unknown };
  return {
    registration: parseRegistration(value?.registration),
    tenant: parseTenant(value?.tenant),
  };
}
