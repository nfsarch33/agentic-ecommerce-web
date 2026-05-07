import { assertRole, AuthError, type Session, type User } from "@/lib/domain/auth";

export interface LoginToBackendOptions {
  readonly baseUrl: string;
  readonly email: string;
  readonly password: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface FetchBackendSessionOptions {
  readonly baseUrl: string;
  readonly accessToken: string;
  readonly fetchImpl?: typeof fetch;
  readonly cache?: RequestCache;
  readonly signal?: AbortSignal;
}

export interface LogoutFromBackendOptions {
  readonly baseUrl: string;
  readonly accessToken?: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface BackendLoginResult {
  readonly accessToken: string;
  readonly session: Session;
}

export class AuthApiError extends Error {
  override readonly name = "AuthApiError";
  override readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.cause = cause;
  }
}

interface RawUser {
  readonly id?: unknown;
  readonly email?: unknown;
  readonly name?: unknown;
  readonly role?: unknown;
}

interface RawSession {
  readonly user?: unknown;
  readonly expires_at?: unknown;
}

interface RawLoginResponse {
  readonly access_token?: unknown;
  readonly session?: unknown;
}

function apiUrl(baseUrl: string, path: string): string {
  const normalized = baseUrl.replace(/\/$/, "");
  if (!normalized) throw new AuthApiError("auth API: baseUrl is required");
  return `${normalized}${path}`;
}

function parseString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new AuthApiError(`${label} must be a non-empty string`);
  }
  return value;
}

function parseUser(raw: unknown): User {
  const value = raw as RawUser;
  try {
    return {
      id: parseString(value?.id, "user.id"),
      email: parseString(value?.email, "user.email"),
      name: typeof value?.name === "string" && value.name.trim() !== "" ? value.name : undefined,
      role: assertRole(value?.role),
    };
  } catch (err) {
    if (err instanceof AuthError) {
      throw new AuthApiError(err.message, err);
    }
    throw err;
  }
}

function parseSession(raw: unknown): Session {
  const value = raw as RawSession;
  return {
    user: parseUser(value?.user),
    expiresAt: parseString(value?.expires_at, "session.expires_at"),
  };
}

async function readJson(res: Response, label: string): Promise<unknown> {
  if (!res.ok) {
    throw new AuthApiError(`${label}: HTTP ${res.status}`);
  }
  try {
    return await res.json();
  } catch (err) {
    throw new AuthApiError(`${label}: invalid JSON`, err);
  }
}

export async function loginToBackend(opts: LoginToBackendOptions): Promise<BackendLoginResult> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(apiUrl(opts.baseUrl, "/api/v1/auth/login"), {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({ email: opts.email, password: opts.password }),
      signal: opts.signal,
    });
  } catch (err) {
    throw new AuthApiError("loginToBackend: network error", err);
  }
  const raw = (await readJson(res, "loginToBackend")) as RawLoginResponse;
  return {
    accessToken: parseString(raw.access_token, "access_token"),
    session: parseSession(raw.session),
  };
}

export async function fetchBackendSession(opts: FetchBackendSessionOptions): Promise<Session> {
  if (!opts.accessToken) throw new AuthApiError("fetchBackendSession: accessToken is required");
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(apiUrl(opts.baseUrl, "/api/v1/auth/me"), {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${opts.accessToken}`,
      },
      cache: opts.cache,
      signal: opts.signal,
    });
  } catch (err) {
    throw new AuthApiError("fetchBackendSession: network error", err);
  }
  return parseSession(await readJson(res, "fetchBackendSession"));
}

export async function logoutFromBackend(opts: LogoutFromBackendOptions): Promise<void> {
  if (!opts.accessToken) return;
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(apiUrl(opts.baseUrl, "/api/v1/auth/logout"), {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${opts.accessToken}`,
      },
      signal: opts.signal,
    });
  } catch (err) {
    throw new AuthApiError("logoutFromBackend: network error", err);
  }
  if (!res.ok && res.status !== 401) {
    throw new AuthApiError(`logoutFromBackend: HTTP ${res.status}`);
  }
}
