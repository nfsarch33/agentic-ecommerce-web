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

export function tenantDisplayLabel(tenant: Pick<TenantSettings, "tenantId" | "displayName">): string {
  return `${tenant.displayName} (${tenant.tenantId})`;
}
