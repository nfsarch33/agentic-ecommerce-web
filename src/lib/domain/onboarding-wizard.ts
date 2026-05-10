// File scope: v3.9.1 Existing #10 -- onboarding wizard typed envelopes.
//
// Wraps the backend POST /api/v1/onboarding/{start,step,complete}
// + GET /api/v1/onboarding/{wizard_id}/state shapes so the
// component renders strongly-typed state without parsing maps in
// React land.

export interface WizardIdentity {
  readonly tenantName: string;
  readonly ownerEmail: string;
  readonly country: string;
  readonly businessType: string;
}

export interface WizardChannels {
  readonly channels: readonly string[];
}

export interface WizardCompliance {
  readonly compliance: readonly string[];
}

export interface WizardSeeding {
  readonly source: string;
  readonly itemCount?: number;
}

export interface OnboardingWizardState {
  readonly tenantId: string;
  readonly wizardId: string;
  readonly currentStep: number;
  readonly completedSteps: readonly number[];
  readonly identity?: WizardIdentity;
  readonly channels?: WizardChannels;
  readonly compliance?: WizardCompliance;
  readonly seeding?: WizardSeeding;
  readonly completed: boolean;
  readonly completedAt?: string;
  readonly startedAt?: string;
}

export const ALLOWED_BUSINESS_TYPES = [
  "sole_trader",
  "partnership",
  "company",
  "trust",
  "non_profit",
] as const;

export const ALLOWED_CHANNELS = [
  "tiktok",
  "rednote",
  "facebook",
  "woocommerce",
  "instagram",
  "pinterest",
] as const;

export const ALLOWED_COMPLIANCE = [
  "au_consumer_law",
  "au_privacy_act",
  "au_australian_tax",
  "cn_ecommerce_law",
  "cn_data_export",
  "gdpr",
] as const;

export const ALLOWED_SEED_SOURCES = ["1688", "taobao", "woocommerce", "manual"] as const;

export type StepNumber = 1 | 2 | 3 | 4;

export function parseWizardState(raw: unknown): OnboardingWizardState | null {
  if (!isRecord(raw)) {
    return null;
  }
  const tenantId = stringField(raw, "tenant_id");
  const wizardId = stringField(raw, "wizard_id");
  const currentStep = numberField(raw, "current_step");
  if (!tenantId || !wizardId || currentStep === null) {
    return null;
  }
  const completedSteps = parseNumberArray(raw["completed_steps"]);
  return {
    tenantId,
    wizardId,
    currentStep,
    completedSteps,
    identity: parseIdentity(raw["identity"]),
    channels: parseChannels(raw["channels"]),
    compliance: parseCompliance(raw["compliance"]),
    seeding: parseSeeding(raw["seeding"]),
    completed: Boolean(raw["completed"]),
    completedAt: optionalString(raw, "completed_at"),
    startedAt: optionalString(raw, "started_at"),
  };
}

function parseIdentity(raw: unknown): WizardIdentity | undefined {
  if (!isRecord(raw)) return undefined;
  const tenantName = stringField(raw, "tenant_name");
  const ownerEmail = stringField(raw, "owner_email");
  const country = stringField(raw, "country");
  const businessType = stringField(raw, "business_type");
  if (!tenantName || !ownerEmail || !country || !businessType) {
    return undefined;
  }
  return { tenantName, ownerEmail, country, businessType };
}

function parseChannels(raw: unknown): WizardChannels | undefined {
  if (!isRecord(raw)) return undefined;
  const list = parseStringArray(raw["channels"]);
  if (list.length === 0) return undefined;
  return { channels: list };
}

function parseCompliance(raw: unknown): WizardCompliance | undefined {
  if (!isRecord(raw)) return undefined;
  const list = parseStringArray(raw["compliance"]);
  if (list.length === 0) return undefined;
  return { compliance: list };
}

function parseSeeding(raw: unknown): WizardSeeding | undefined {
  if (!isRecord(raw)) return undefined;
  const source = stringField(raw, "source");
  if (!source) return undefined;
  const itemCount = numberField(raw, "item_count") ?? undefined;
  return { source, itemCount };
}

function parseStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function parseNumberArray(value: unknown): readonly number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is number => typeof v === "number");
}

function stringField(raw: Record<string, unknown>, key: string): string {
  const v = raw[key];
  return typeof v === "string" ? v : "";
}

function optionalString(raw: Record<string, unknown>, key: string): string | undefined {
  const v = raw[key];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function numberField(raw: Record<string, unknown>, key: string): number | null {
  const v = raw[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
