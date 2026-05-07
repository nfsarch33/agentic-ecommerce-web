type Env = Readonly<Record<string, string | undefined>>;

export type AuthCookieSameSite = "lax" | "strict" | "none";

export interface AuthCookieConfig {
  readonly secure: boolean;
  readonly sameSite: AuthCookieSameSite;
  readonly domain?: string;
}

export interface DeploymentConfig {
  readonly mcApiBaseUrl: string;
  readonly publicMcApiBaseUrl?: string;
  readonly publicAppOrigin?: string;
  readonly mediaCdnBaseUrl?: string;
  readonly n8nUrl?: string;
  readonly temporalUiUrl?: string;
  readonly authCookie: AuthCookieConfig;
}

export interface DeploymentCheck {
  readonly name: string;
  readonly ok: boolean;
  readonly detail: string;
}

export interface DeploymentReadiness {
  readonly ready: boolean;
  readonly checks: readonly DeploymentCheck[];
}

function trimmed(value: string | undefined): string | undefined {
  const next = value?.trim();
  return next ? next : undefined;
}

export function normalizeHttpBaseUrl(value: string | undefined): string | undefined {
  const raw = trimmed(value);
  if (!raw) return undefined;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return undefined;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return undefined;
  }

  const pathname = url.pathname === "/" ? "" : url.pathname.replace(/\/+$/, "");
  return `${url.origin}${pathname}`;
}

function isHttpsBaseUrl(value: string | undefined): boolean {
  const normalized = normalizeHttpBaseUrl(value);
  return normalized ? new URL(normalized).protocol === "https:" : false;
}

function parseBoolean(value: string | undefined): boolean | undefined {
  const raw = trimmed(value)?.toLowerCase();
  if (!raw) return undefined;
  if (["1", "true", "yes", "on"].includes(raw)) return true;
  if (["0", "false", "no", "off"].includes(raw)) return false;
  return undefined;
}

function parseSameSite(value: string | undefined): AuthCookieSameSite | undefined {
  const raw = trimmed(value)?.toLowerCase();
  if (raw === "lax" || raw === "strict" || raw === "none") return raw;
  return undefined;
}

export function resolveAuthCookieConfig(env: Env = process.env): AuthCookieConfig {
  const sameSite = parseSameSite(env.AUTH_COOKIE_SAME_SITE) ?? "lax";
  const explicitSecure = parseBoolean(env.AUTH_COOKIE_SECURE);
  const secure = sameSite === "none" ? true : (explicitSecure ?? env.NODE_ENV === "production");
  const domain = trimmed(env.AUTH_COOKIE_DOMAIN);

  return {
    secure,
    sameSite,
    ...(domain ? { domain } : {}),
  };
}

export function resolveDeploymentConfig(env: Env = process.env): DeploymentConfig {
  return {
    mcApiBaseUrl: normalizeHttpBaseUrl(env.MC_API_BASE_URL) ?? trimmed(env.MC_API_BASE_URL) ?? "http://localhost:8080",
    publicMcApiBaseUrl: normalizeHttpBaseUrl(env.NEXT_PUBLIC_MC_API_BASE_URL),
    publicAppOrigin:
      normalizeHttpBaseUrl(env.NEXT_PUBLIC_APP_ORIGIN) ?? normalizeHttpBaseUrl(env.NEXT_PUBLIC_SITE_URL),
    mediaCdnBaseUrl: normalizeHttpBaseUrl(env.NEXT_PUBLIC_MEDIA_CDN_BASE_URL),
    n8nUrl: normalizeHttpBaseUrl(env.NEXT_PUBLIC_N8N_URL),
    temporalUiUrl: normalizeHttpBaseUrl(env.NEXT_PUBLIC_TEMPORAL_UI_URL),
    authCookie: resolveAuthCookieConfig(env),
  };
}

function requiredUrlCheck(name: string, value: string | undefined, requireHttps = false): DeploymentCheck {
  const normalized = normalizeHttpBaseUrl(value);
  if (!trimmed(value)) {
    return { name, ok: false, detail: "missing required http(s) URL" };
  }
  if (!normalized) {
    return { name, ok: false, detail: "must be an absolute http(s) URL" };
  }
  if (requireHttps && !isHttpsBaseUrl(normalized)) {
    return { name, ok: false, detail: "must use HTTPS in production" };
  }
  return { name, ok: true, detail: normalized };
}

function optionalUrlCheck(name: string, value: string | undefined, requireHttps = false): DeploymentCheck {
  const raw = trimmed(value);
  if (!raw) {
    return { name, ok: true, detail: "not configured" };
  }
  const normalized = normalizeHttpBaseUrl(raw);
  if (!normalized) {
    return { name, ok: false, detail: "must be an absolute http(s) URL when configured" };
  }
  if (requireHttps && !isHttpsBaseUrl(normalized)) {
    return { name, ok: false, detail: "must use HTTPS in production" };
  }
  return { name, ok: true, detail: normalized };
}

export function deploymentReadiness(env: Env = process.env): DeploymentReadiness {
  const isProduction = env.NODE_ENV === "production";
  const mcApiBaseUrl = isProduction ? env.MC_API_BASE_URL : (env.MC_API_BASE_URL ?? "http://localhost:8080");
  const publicAppOrigin = env.NEXT_PUBLIC_APP_ORIGIN ?? env.NEXT_PUBLIC_SITE_URL;
  const publicMcApiBaseUrl = env.NEXT_PUBLIC_MC_API_BASE_URL ?? mcApiBaseUrl;

  const checks: DeploymentCheck[] = [
    requiredUrlCheck("MC_API_BASE_URL", mcApiBaseUrl),
    isProduction
      ? requiredUrlCheck("NEXT_PUBLIC_MC_API_BASE_URL", publicMcApiBaseUrl, true)
      : optionalUrlCheck("NEXT_PUBLIC_MC_API_BASE_URL", env.NEXT_PUBLIC_MC_API_BASE_URL),
    isProduction
      ? requiredUrlCheck("NEXT_PUBLIC_APP_ORIGIN", publicAppOrigin, true)
      : optionalUrlCheck("NEXT_PUBLIC_APP_ORIGIN", publicAppOrigin),
    optionalUrlCheck("NEXT_PUBLIC_MEDIA_CDN_BASE_URL", env.NEXT_PUBLIC_MEDIA_CDN_BASE_URL, isProduction),
    optionalUrlCheck("NEXT_PUBLIC_N8N_URL", env.NEXT_PUBLIC_N8N_URL, isProduction),
    optionalUrlCheck("NEXT_PUBLIC_TEMPORAL_UI_URL", env.NEXT_PUBLIC_TEMPORAL_UI_URL, isProduction),
  ];

  return {
    ready: checks.every((check) => check.ok),
    checks,
  };
}
