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
});
