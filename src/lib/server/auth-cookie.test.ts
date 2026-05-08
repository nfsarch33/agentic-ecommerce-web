import { describe, expect, it } from "vitest";
import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  clearAuthCookie,
  readAuthTokenFromCookieHeader,
  readAuthTokenFromRequest,
  setAuthCookie,
} from "./auth-cookie";

describe("readAuthTokenFromCookieHeader", () => {
  it("returns null for null or empty cookie headers", () => {
    expect(readAuthTokenFromCookieHeader(null)).toBeNull();
    expect(readAuthTokenFromCookieHeader("")).toBeNull();
  });

  it("returns null when the auth cookie is not present", () => {
    expect(readAuthTokenFromCookieHeader("foo=bar; baz=qux")).toBeNull();
  });

  it("decodes URL-encoded auth cookie values", () => {
    const encoded = encodeURIComponent("token+abc/=");
    expect(
      readAuthTokenFromCookieHeader(`${AUTH_COOKIE_NAME}=${encoded}; other=ignored`),
    ).toBe("token+abc/=");
  });

  it("falls back to the raw value when decodeURIComponent fails", () => {
    // Bare percent without two hex digits triggers a URIError inside decodeURIComponent.
    const malformed = "%E0%A4%A";
    expect(readAuthTokenFromCookieHeader(`${AUTH_COOKIE_NAME}=${malformed}`)).toBe(
      malformed,
    );
  });

  it("returns null when the cookie value is empty after decoding", () => {
    expect(readAuthTokenFromCookieHeader(`${AUTH_COOKIE_NAME}=`)).toBeNull();
  });

  it("delegates to readAuthTokenFromRequest using the request cookie header", () => {
    const request = new Request("https://example.test/api", {
      headers: { cookie: `${AUTH_COOKIE_NAME}=session-abc` },
    });
    expect(readAuthTokenFromRequest(request)).toBe("session-abc");
  });
});

describe("setAuthCookie / clearAuthCookie", () => {
  it("writes a long-lived secure cookie that carries the access token", () => {
    const response = NextResponse.next();
    setAuthCookie(response, "token-xyz");
    const cookie = response.cookies.get(AUTH_COOKIE_NAME);
    expect(cookie?.value).toBe("token-xyz");
  });

  it("clears the auth cookie by writing an empty value with maxAge=0", () => {
    const response = NextResponse.next();
    setAuthCookie(response, "token-xyz");
    clearAuthCookie(response);
    const cookie = response.cookies.get(AUTH_COOKIE_NAME);
    expect(cookie?.value).toBe("");
  });
});
