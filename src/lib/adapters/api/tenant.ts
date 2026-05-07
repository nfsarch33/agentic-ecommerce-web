import {
  createTenantSettings,
  TenantValidationError,
  type TenantSettings,
} from "@/lib/domain/tenant";

export interface TenantApiOptions {
  readonly baseUrl: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface UpdateTenantSettingsOptions extends TenantApiOptions {
  readonly settings: TenantSettings;
}

export class TenantApiError extends Error {
  override readonly name = "TenantApiError";
  override readonly cause?: unknown;
  readonly status?: number;

  constructor(message: string, options: { readonly status?: number; readonly cause?: unknown } = {}) {
    super(message);
    this.status = options.status;
    this.cause = options.cause;
  }
}

interface RawTenantSettings {
  readonly tenant_id?: unknown;
  readonly tenantId?: unknown;
  readonly display_name?: unknown;
  readonly displayName?: unknown;
  readonly branding?: {
    readonly logo_url?: unknown;
    readonly logoUrl?: unknown;
    readonly primary_color?: unknown;
    readonly primaryColor?: unknown;
    readonly accent_color?: unknown;
    readonly accentColor?: unknown;
  };
  readonly preferences?: {
    readonly default_locale?: unknown;
    readonly defaultLocale?: unknown;
    readonly currency?: unknown;
    readonly timezone?: unknown;
    readonly ai_tone?: unknown;
    readonly aiTone?: unknown;
    readonly compliance_strict_mode?: unknown;
    readonly complianceStrictMode?: unknown;
    readonly data_retention_days?: unknown;
    readonly dataRetentionDays?: unknown;
  };
  readonly updated_at?: unknown;
  readonly updatedAt?: unknown;
}

function apiUrl(baseUrl: string, path: string): string {
  if (!baseUrl) throw new TenantApiError("tenant API: baseUrl is required");
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

function text(value: unknown, label: string): string {
  if (typeof value !== "string") throw new TenantApiError(`${label} must be a string`);
  return value;
}

function bool(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") throw new TenantApiError(`${label} must be boolean`);
  return value;
}

function number(value: unknown, label: string): number {
  if (typeof value !== "number") throw new TenantApiError(`${label} must be a number`);
  return value;
}

function optionalText(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function parseSettings(raw: unknown): TenantSettings {
  const value = raw as RawTenantSettings;
  const branding = value.branding ?? {};
  const preferences = value.preferences ?? {};
  try {
    return createTenantSettings({
      tenantId: text(value.tenant_id ?? value.tenantId, "settings.tenant_id"),
      displayName: text(value.display_name ?? value.displayName, "settings.display_name"),
      branding: {
        logoUrl: optionalText(branding.logo_url ?? branding.logoUrl),
        primaryColor: text(branding.primary_color ?? branding.primaryColor, "settings.branding.primary_color"),
        accentColor: text(branding.accent_color ?? branding.accentColor, "settings.branding.accent_color"),
      },
      preferences: {
        defaultLocale: text(
          preferences.default_locale ?? preferences.defaultLocale,
          "settings.preferences.default_locale",
        ),
        currency: text(preferences.currency, "settings.preferences.currency"),
        timezone: text(preferences.timezone, "settings.preferences.timezone"),
        aiTone: text(preferences.ai_tone ?? preferences.aiTone, "settings.preferences.ai_tone"),
        complianceStrictMode: bool(
          preferences.compliance_strict_mode ?? preferences.complianceStrictMode,
          "settings.preferences.compliance_strict_mode",
        ),
        dataRetentionDays: number(
          preferences.data_retention_days ?? preferences.dataRetentionDays,
          "settings.preferences.data_retention_days",
        ),
      },
      updatedAt: text(value.updated_at ?? value.updatedAt, "settings.updated_at"),
    });
  } catch (err) {
    if (err instanceof TenantValidationError || err instanceof TenantApiError) {
      throw new TenantApiError(`parseTenantSettings: ${err.message}`, { cause: err });
    }
    throw err;
  }
}

async function readJson(res: Response, label: string): Promise<unknown> {
  if (!res.ok) throw new TenantApiError(`${label}: HTTP ${res.status}`, { status: res.status });
  try {
    return await res.json();
  } catch (err) {
    throw new TenantApiError(`${label}: invalid JSON`, { cause: err });
  }
}

function settingsPayload(settings: TenantSettings) {
  return {
    display_name: settings.displayName,
    branding: {
      logo_url: settings.branding.logoUrl,
      primary_color: settings.branding.primaryColor,
      accent_color: settings.branding.accentColor,
    },
    preferences: {
      default_locale: settings.preferences.defaultLocale,
      currency: settings.preferences.currency,
      timezone: settings.preferences.timezone,
      ai_tone: settings.preferences.aiTone,
      compliance_strict_mode: settings.preferences.complianceStrictMode,
      data_retention_days: settings.preferences.dataRetentionDays,
    },
  };
}

export async function fetchTenantSettings(opts: TenantApiOptions): Promise<TenantSettings> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(apiUrl(opts.baseUrl, "/api/v1/tenants/current/settings"), {
      method: "GET",
      headers: { accept: "application/json" },
      signal: opts.signal,
    });
  } catch (err) {
    throw new TenantApiError("fetchTenantSettings: network error", { cause: err });
  }
  const raw = (await readJson(res, "fetchTenantSettings")) as { settings?: unknown } | RawTenantSettings;
  return parseSettings("settings" in raw ? raw.settings : raw);
}

export async function updateTenantSettings(opts: UpdateTenantSettingsOptions): Promise<TenantSettings> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const settings = createTenantSettings(opts.settings);
  let res: Response;
  try {
    res = await fetchImpl(apiUrl(opts.baseUrl, "/api/v1/tenants/current/settings"), {
      method: "PATCH",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify(settingsPayload(settings)),
      signal: opts.signal,
    });
  } catch (err) {
    throw new TenantApiError("updateTenantSettings: network error", { cause: err });
  }
  const raw = (await readJson(res, "updateTenantSettings")) as { settings?: unknown } | RawTenantSettings;
  return parseSettings("settings" in raw ? raw.settings : raw);
}
