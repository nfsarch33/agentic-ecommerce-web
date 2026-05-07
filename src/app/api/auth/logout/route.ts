import { NextResponse } from "next/server";
import { logoutFromBackend } from "@/lib/adapters/api/auth";
import { readAuthTokenFromRequest, clearAuthCookie } from "@/lib/server/auth-cookie";
import { authBackendBaseUrl } from "@/lib/server/auth-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  const accessToken = readAuthTokenFromRequest(request);
  if (accessToken) {
    try {
      await logoutFromBackend({
        baseUrl: authBackendBaseUrl(),
        accessToken,
      });
    } catch {
      // Logout must clear the browser session even if the backend token is already invalid.
    }
  }

  const response = NextResponse.json({ ok: true });
  clearAuthCookie(response);
  return response;
}
