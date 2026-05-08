// Domain helpers for tenants. Pre-existing types power the per-tenant
// settings panel (branding, preferences). v2.4.0 adds the `Tenant`
// aggregate, status state machine, and slug validation that drive
// the new admin tenant lifecycle pages.

export interface TenantBranding {
  readonly logoUrl?: string;
  readonly primaryColor: string;
  readonly accentColor: string;
}

export interface TenantPreferences {
  readonly defaultLocale: string;
  readonly currency: string;
  readonly timezone: string;
  readonly aiTone: string;
  readonly complianceStrictMode: boolean;
  readonly dataRetentionDays: number;
}

export interface TenantSettings {
  readonly tenantId: string;
  readonly displayName: string;
  readonly branding: TenantBranding;
  readonly preferences: TenantPreferences;
  readonly updatedAt: string;
}

export interface TenantOption {
  readonly tenantId: string;
  readonly displayName: string;
}

export class TenantValidationError extends Error {
  override readonly name = "TenantValidationError";
}

const hexColorPattern = /^#[0-9a-f]{6}$/i;

function requiredText(value: string, label: string): string {
  const trimmed = value.trim();
  if (trimmed === "") throw new TenantValidationError(`${label} must be non-empty`);
  return trimmed;
}

function optionalUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function color(value: string, label: string): string {
  const trimmed = requiredText(value, label);
  if (!hexColorPattern.test(trimmed)) {
    throw new TenantValidationError(`${label} must be a hex color`);
  }
  return trimmed.toLowerCase();
}

function retentionDays(value: number): number {
  if (!Number.isFinite(value) || value < 1) {
    throw new TenantValidationError("dataRetentionDays must be greater than zero");
  }
  return Math.round(value);
}

export function createTenantSettings(input: TenantSettings): TenantSettings {
  return {
    tenantId: requiredText(input.tenantId, "tenantId"),
    displayName: requiredText(input.displayName, "displayName"),
    branding: {
      logoUrl: optionalUrl(input.branding.logoUrl),
      primaryColor: color(input.branding.primaryColor, "branding.primaryColor"),
      accentColor: color(input.branding.accentColor, "branding.accentColor"),
    },
    preferences: {
      defaultLocale: requiredText(input.preferences.defaultLocale, "preferences.defaultLocale"),
      currency: requiredText(input.preferences.currency, "preferences.currency").toUpperCase(),
      timezone: requiredText(input.preferences.timezone, "preferences.timezone"),
      aiTone: requiredText(input.preferences.aiTone, "preferences.aiTone"),
      complianceStrictMode: Boolean(input.preferences.complianceStrictMode),
      dataRetentionDays: retentionDays(input.preferences.dataRetentionDays),
    },
    updatedAt: requiredText(input.updatedAt, "updatedAt"),
  };
}

export function tenantDisplayLabel(
  tenant: Pick<TenantSettings, "tenantId" | "displayName">,
): string {
  return `${tenant.displayName} (${tenant.tenantId})`;
}

// ---------- v2.4.0 tenant aggregate ----------
//
// Mirrors the Go state machine in internal/tenant/aggregate.go on
// the backend. The transition table here is the authoritative
// client-side guard for the suspend/activate/archive buttons.

export type TenantStatus = "provisioning" | "active" | "suspended" | "archived";

export type TenantTransition = "activate" | "suspend" | "archive";

export interface Tenant {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly plan: string;
  readonly status: TenantStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export class IllegalTenantTransitionError extends Error {
  readonly from: TenantStatus;
  readonly via: TenantTransition;
  constructor(from: TenantStatus, via: TenantTransition) {
    super(`Illegal tenant transition: ${from} -> ${via}`);
    this.name = "IllegalTenantTransitionError";
    this.from = from;
    this.via = via;
  }
}

const tenantTransitionTable: Readonly<
  Record<TenantStatus, Partial<Record<TenantTransition, TenantStatus>>>
> = Object.freeze({
  provisioning: { activate: "active", archive: "archived" },
  active: { suspend: "suspended", archive: "archived" },
  suspended: { activate: "active", archive: "archived" },
  archived: {},
});

export function nextTenantStatus(from: TenantStatus, via: TenantTransition): TenantStatus {
  const next = tenantTransitionTable[from]?.[via];
  if (!next) throw new IllegalTenantTransitionError(from, via);
  return next;
}

export function canActivateTenant(state: TenantStatus): boolean {
  return Boolean(tenantTransitionTable[state]?.activate);
}

export function canSuspendTenant(state: TenantStatus): boolean {
  return Boolean(tenantTransitionTable[state]?.suspend);
}

export function canArchiveTenant(state: TenantStatus): boolean {
  return Boolean(tenantTransitionTable[state]?.archive);
}

export function tenantStatusLabel(state: TenantStatus): string {
  switch (state) {
    case "provisioning":
      return "Provisioning";
    case "active":
      return "Active";
    case "suspended":
      return "Suspended";
    case "archived":
      return "Archived";
  }
}

export function tenantStatusTone(
  state: TenantStatus,
): "neutral" | "ok" | "warn" | "danger" {
  switch (state) {
    case "provisioning":
      return "neutral";
    case "active":
      return "ok";
    case "suspended":
      return "warn";
    case "archived":
      return "danger";
  }
}

export function isTenantStatus(value: string): value is TenantStatus {
  return (
    value === "provisioning" ||
    value === "active" ||
    value === "suspended" ||
    value === "archived"
  );
}

const tenantSlugPattern = /^[a-z][a-z0-9-]*[a-z0-9]$/;

export function isValidTenantSlug(value: string): boolean {
  return tenantSlugPattern.test(value);
}

export function allLegalTenantTransitions(): ReadonlyArray<{
  from: TenantStatus;
  via: TenantTransition;
  to: TenantStatus;
}> {
  const out: { from: TenantStatus; via: TenantTransition; to: TenantStatus }[] = [];
  for (const [from, moves] of Object.entries(tenantTransitionTable)) {
    for (const [via, to] of Object.entries(moves ?? {})) {
      out.push({
        from: from as TenantStatus,
        via: via as TenantTransition,
        to: to as TenantStatus,
      });
    }
  }
  return out;
}
