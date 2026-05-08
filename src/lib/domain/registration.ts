// Domain entities for the v2.5.0 tenant self-service registration
// workflow. Mirrors the Go state machine in internal/registration on
// the backend.

export type RegistrationStatus =
  | "pending_email_verification"
  | "email_verified"
  | "onboarding"
  | "active";

export interface RegistrationRequest {
  readonly id: string;
  readonly email: string;
  readonly slugRequested: string;
  readonly planRequested: string;
  readonly status: RegistrationStatus;
  readonly tenantId?: string;
  readonly companyName?: string;
}

const statusOrder: Readonly<Record<RegistrationStatus, number>> = Object.freeze({
  pending_email_verification: 0,
  email_verified: 1,
  onboarding: 2,
  active: 3,
});

export function isRegistrationStatus(value: string): value is RegistrationStatus {
  return value in statusOrder;
}

export function statusRank(status: RegistrationStatus): number {
  return statusOrder[status];
}

export function isAtOrAfter(current: RegistrationStatus, target: RegistrationStatus): boolean {
  return statusOrder[current] >= statusOrder[target];
}

const slugPattern = /^[a-z][a-z0-9-]*[a-z0-9]$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidSlug(value: string): boolean {
  return slugPattern.test(value);
}

export function isValidEmail(value: string): boolean {
  return emailPattern.test(value);
}

export const SUPPORTED_PLANS: readonly string[] = Object.freeze([
  "free",
  "starter",
  "pro",
]);

export function isSupportedPlan(value: string): boolean {
  return SUPPORTED_PLANS.includes(value);
}

export interface RegistrationStep {
  readonly id: RegistrationStatus | "submit";
  readonly label: string;
  readonly description: string;
}

export const REGISTRATION_WIZARD_STEPS: readonly RegistrationStep[] = Object.freeze([
  { id: "submit", label: "Sign up", description: "Email + tenant slug" },
  {
    id: "pending_email_verification",
    label: "Verify email",
    description: "Click the link in your inbox.",
  },
  { id: "onboarding", label: "Onboarding", description: "Company name + plan." },
  { id: "active", label: "Done", description: "Tenant provisioned." },
]);
