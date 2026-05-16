const defaultBaseURL = "http://127.0.0.1:3100";

function normalizeBaseURL(baseURL: string): string {
  return baseURL.endsWith("/") ? baseURL : `${baseURL}/`;
}

export function resolveBaseURL(
  currentURL: string,
  fallbackBaseURL = process.env.PLAYWRIGHT_BASE_URL ?? defaultBaseURL,
): string {
  if (currentURL && currentURL !== "about:blank") {
    return new URL("/", currentURL).toString();
  }

  return normalizeBaseURL(fallbackBaseURL);
}

export function resolveLoginURL(currentURL: string, fallbackBaseURL?: string): string {
  return new URL("/api/auth/login", resolveBaseURL(currentURL, fallbackBaseURL)).toString();
}

export function resolveAdminURL(currentURL: string, fallbackBaseURL?: string): string {
  return new URL("/admin", resolveBaseURL(currentURL, fallbackBaseURL)).toString();
}
