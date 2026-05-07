import { NextResponse } from "next/server";
import { fetchBackendSession } from "@/lib/adapters/api/auth";
import { readAuthTokenFromRequest } from "@/lib/server/auth-cookie";
import { authBackendBaseUrl } from "@/lib/server/auth-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const accessToken = readAuthTokenFromRequest(request);
  if (!accessToken) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  try {
    const session = await fetchBackendSession({
      baseUrl: authBackendBaseUrl(),
      accessToken,
    });
    return NextResponse.json({ session });
  } catch (err) {
    return NextResponse.json(
      { error: "unauthenticated", detail: err instanceof Error ? err.message : "unknown" },
      { status: 401 },
    );
  }
}
