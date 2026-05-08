import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchBackendSession = vi.fn();
const headersMock = vi.fn();
const redirectMock = vi.fn((target: string) => {
  throw new Error(`__redirect__:${target}`);
});

vi.mock("@/lib/adapters/api/auth", () => ({
  fetchBackendSession: (...args: unknown[]) => fetchBackendSession(...args),
}));

vi.mock("next/headers", () => ({
  headers: () => headersMock(),
}));

vi.mock("next/navigation", () => ({
  redirect: (target: string) => redirectMock(target),
}));

import {
  authBackendBaseUrl,
  getServerSession,
  getSessionFromCookieHeader,
  requireServerSession,
} from "./auth-session";
import { AUTH_COOKIE_NAME } from "./auth-cookie";
import type { Session } from "@/lib/domain/auth";

const adminSession: Session = {
  user: { id: "u_1", email: "admin@example.com", role: "admin" },
  expiresAt: "2026-05-08T00:00:00Z",
};
const operatorSession: Session = {
  user: { id: "u_2", email: "operator@example.com", role: "operator" },
  expiresAt: "2026-05-08T00:00:00Z",
};
const viewerSession: Session = {
  user: { id: "u_3", email: "viewer@example.com", role: "viewer" },
  expiresAt: "2026-05-08T00:00:00Z",
};

const originalEnv = process.env.MC_API_BASE_URL;

beforeEach(() => {
  fetchBackendSession.mockReset();
  headersMock.mockReset();
  redirectMock.mockClear();
});

afterEach(() => {
  process.env.MC_API_BASE_URL = originalEnv;
});

describe("authBackendBaseUrl", () => {
  it("returns the configured MC_API_BASE_URL when set", () => {
    process.env.MC_API_BASE_URL = "https://api.example.com";
    expect(authBackendBaseUrl()).toBe("https://api.example.com");
  });

  it("falls back to localhost when MC_API_BASE_URL is unset", () => {
    delete process.env.MC_API_BASE_URL;
    expect(authBackendBaseUrl()).toBe("http://localhost:8080");
  });
});

describe("getSessionFromCookieHeader", () => {
  it("returns null when no cookie header is provided", async () => {
    expect(await getSessionFromCookieHeader(null)).toBeNull();
    expect(fetchBackendSession).not.toHaveBeenCalled();
  });

  it("returns null when the auth cookie is missing", async () => {
    expect(await getSessionFromCookieHeader("foo=bar")).toBeNull();
    expect(fetchBackendSession).not.toHaveBeenCalled();
  });

  it("calls fetchBackendSession with no-store and forwards the resolved session", async () => {
    fetchBackendSession.mockResolvedValueOnce(adminSession);
    const session = await getSessionFromCookieHeader(`${AUTH_COOKIE_NAME}=token-xyz`);
    expect(session).toBe(adminSession);
    expect(fetchBackendSession).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: "token-xyz", cache: "no-store" }),
    );
  });

  it("returns null when fetchBackendSession throws", async () => {
    fetchBackendSession.mockRejectedValueOnce(new Error("HTTP 401"));
    expect(await getSessionFromCookieHeader(`${AUTH_COOKIE_NAME}=token-xyz`)).toBeNull();
  });
});

describe("getServerSession", () => {
  it("reads cookies from next/headers and resolves the session", async () => {
    const get = vi.fn().mockReturnValue(`${AUTH_COOKIE_NAME}=token-xyz`);
    headersMock.mockReturnValue(Promise.resolve({ get }));
    fetchBackendSession.mockResolvedValueOnce(adminSession);

    const session = await getServerSession();
    expect(session).toBe(adminSession);
    expect(get).toHaveBeenCalledWith("cookie");
  });

  it("returns null when next/headers reports no cookie", async () => {
    headersMock.mockReturnValue(Promise.resolve({ get: () => null }));
    expect(await getServerSession()).toBeNull();
  });
});

describe("requireServerSession", () => {
  it("returns the session when it satisfies the minimum role", async () => {
    headersMock.mockReturnValue(
      Promise.resolve({ get: () => `${AUTH_COOKIE_NAME}=token-xyz` }),
    );
    fetchBackendSession.mockResolvedValueOnce(adminSession);

    await expect(requireServerSession("admin")).resolves.toBe(adminSession);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("redirects to /login when the cookie is absent", async () => {
    headersMock.mockReturnValue(Promise.resolve({ get: () => null }));
    await expect(requireServerSession()).rejects.toThrow(/__redirect__:\/login\?next=\/admin/);
    expect(redirectMock).toHaveBeenCalledWith("/login?next=/admin");
  });

  it("redirects to /admin when the role is too low", async () => {
    headersMock.mockReturnValue(
      Promise.resolve({ get: () => `${AUTH_COOKIE_NAME}=token-xyz` }),
    );
    fetchBackendSession.mockResolvedValueOnce(viewerSession);
    await expect(requireServerSession("admin")).rejects.toThrow(/__redirect__:\/admin/);
    expect(redirectMock).toHaveBeenCalledWith("/admin");
  });

  it("permits operator roles when the minimum is operator", async () => {
    headersMock.mockReturnValue(
      Promise.resolve({ get: () => `${AUTH_COOKIE_NAME}=token-xyz` }),
    );
    fetchBackendSession.mockResolvedValueOnce(operatorSession);
    await expect(requireServerSession("operator")).resolves.toBe(operatorSession);
  });

  it("defaults the minimum role to viewer", async () => {
    headersMock.mockReturnValue(
      Promise.resolve({ get: () => `${AUTH_COOKIE_NAME}=token-xyz` }),
    );
    fetchBackendSession.mockResolvedValueOnce(viewerSession);
    await expect(requireServerSession()).resolves.toBe(viewerSession);
  });
});
