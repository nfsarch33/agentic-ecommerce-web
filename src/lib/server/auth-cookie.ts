import { NextResponse } from "next/server";

export const AUTH_COOKIE_NAME = "ec_session";

const cookiePath = "/";
const sessionMaxAgeSeconds = 60 * 60 * 8;

export function readAuthTokenFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((part) => part.trim());
  const match = cookies.find((cookie) => cookie.startsWith(`${AUTH_COOKIE_NAME}=`));
  if (!match) return null;
  const [, value = ""] = match.split("=");
  try {
    return decodeURIComponent(value) || null;
  } catch {
    return value || null;
  }
}

export function readAuthTokenFromRequest(request: Request): string | null {
  return readAuthTokenFromCookieHeader(request.headers.get("cookie"));
}

export function setAuthCookie(response: NextResponse, accessToken: string): void {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: accessToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: cookiePath,
    maxAge: sessionMaxAgeSeconds,
  });
}

export function clearAuthCookie(response: NextResponse): void {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: cookiePath,
    maxAge: 0,
  });
}
