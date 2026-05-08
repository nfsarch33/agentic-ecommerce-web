import { describe, expect, it, vi } from "vitest";
import {
  AuthApiError,
  fetchBackendSession,
  loginToBackend,
  logoutFromBackend,
} from "./auth";

function jsonResponse(body: unknown, init: ResponseInit = { status: 200 }): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    ...init,
  });
}

const backendLoginResponse = {
  access_token: "jwt-token",
  session: {
    user: {
      id: "u_1",
      email: "admin@example.com",
      name: "Ada Admin",
      role: "admin",
    },
    expires_at: "2026-05-07T10:00:00Z",
  },
};

describe("loginToBackend", () => {
  it("posts credentials to the expected backend auth contract", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse(backendLoginResponse));

    const result = await loginToBackend({
      baseUrl: "http://api.test",
      email: "admin@example.com",
      password: "correct horse battery staple",
      fetchImpl: mockFetch,
    });

    expect(result.accessToken).toBe("jwt-token");
    expect(result.session.user.role).toBe("admin");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/auth/login",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "content-type": "application/json" }),
        body: JSON.stringify({
          email: "admin@example.com",
          password: "correct horse battery staple",
        }),
      }),
    );
  });

  it("rejects malformed login responses that omit the token", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ session: backendLoginResponse.session }));
    await expect(
      loginToBackend({
        baseUrl: "http://api.test",
        email: "admin@example.com",
        password: "secret",
        fetchImpl: mockFetch,
      }),
    ).rejects.toBeInstanceOf(AuthApiError);
  });
});

describe("fetchBackendSession", () => {
  it("uses the httpOnly cookie token as a bearer token for /me", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse(backendLoginResponse.session));

    const session = await fetchBackendSession({
      baseUrl: "http://api.test",
      accessToken: "jwt-token",
      fetchImpl: mockFetch,
    });

    expect(session.user.email).toBe("admin@example.com");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/auth/me",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ authorization: "Bearer jwt-token" }),
      }),
    );
  });
});

describe("logoutFromBackend", () => {
  it("posts logout with the bearer token when present", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));

    await logoutFromBackend({
      baseUrl: "http://api.test",
      accessToken: "jwt-token",
      fetchImpl: mockFetch,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/auth/logout",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ authorization: "Bearer jwt-token" }),
      }),
    );
  });

  it("is a no-op when no accessToken is supplied", async () => {
    const mockFetch = vi.fn();
    await logoutFromBackend({ baseUrl: "http://api.test", fetchImpl: mockFetch });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("treats 401 as an idempotent success", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
    await expect(
      logoutFromBackend({ baseUrl: "http://api.test", accessToken: "stale", fetchImpl: mockFetch }),
    ).resolves.toBeUndefined();
  });

  it("wraps 5xx responses in AuthApiError", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 502 }));
    await expect(
      logoutFromBackend({ baseUrl: "http://api.test", accessToken: "jwt", fetchImpl: mockFetch }),
    ).rejects.toThrow(/HTTP 502/);
  });

  it("wraps fetch network failures in AuthApiError", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    await expect(
      logoutFromBackend({ baseUrl: "http://api.test", accessToken: "jwt", fetchImpl: mockFetch }),
    ).rejects.toThrow(/network error/);
  });
});

describe("auth adapter input validation and error wrapping", () => {
  it("loginToBackend wraps fetch network failures", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    await expect(
      loginToBackend({
        baseUrl: "http://api.test",
        email: "admin@example.com",
        password: "secret",
        fetchImpl: mockFetch,
      }),
    ).rejects.toThrow(/network error/);
  });

  it("loginToBackend rejects an empty baseUrl (wrapped as a network error)", async () => {
    // apiUrl() throws AuthApiError for empty baseUrl, which loginToBackend
    // re-wraps inside its own network-error catch. We just want to assert it
    // surfaces an AuthApiError rather than a raw fetch failure.
    await expect(
      loginToBackend({
        baseUrl: "",
        email: "admin@example.com",
        password: "secret",
      }),
    ).rejects.toBeInstanceOf(AuthApiError);
  });

  it("loginToBackend wraps non-2xx responses with the HTTP status", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ error: "bad" }, { status: 401 }));
    await expect(
      loginToBackend({
        baseUrl: "http://api.test",
        email: "admin@example.com",
        password: "secret",
        fetchImpl: mockFetch,
      }),
    ).rejects.toThrow(/HTTP 401/);
  });

  it("loginToBackend rejects responses whose JSON cannot be parsed", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response("not json", { status: 200, headers: { "content-type": "application/json" } }),
    );
    await expect(
      loginToBackend({
        baseUrl: "http://api.test",
        email: "admin@example.com",
        password: "secret",
        fetchImpl: mockFetch,
      }),
    ).rejects.toThrow(/invalid JSON/);
  });

  it("fetchBackendSession requires an accessToken", async () => {
    await expect(
      fetchBackendSession({ baseUrl: "http://api.test", accessToken: "" }),
    ).rejects.toThrow(/accessToken is required/);
  });

  it("fetchBackendSession wraps fetch network failures", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    await expect(
      fetchBackendSession({
        baseUrl: "http://api.test",
        accessToken: "jwt",
        fetchImpl: mockFetch,
      }),
    ).rejects.toThrow(/network error/);
  });

  it("fetchBackendSession rejects malformed session payloads", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ user: { id: "u_1", email: "x@example.com", role: "wizard" }, expires_at: "2026" }));
    await expect(
      fetchBackendSession({
        baseUrl: "http://api.test",
        accessToken: "jwt",
        fetchImpl: mockFetch,
      }),
    ).rejects.toBeInstanceOf(AuthApiError);
  });
});
