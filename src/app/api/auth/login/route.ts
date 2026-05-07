import { NextResponse } from "next/server";
import { loginToBackend } from "@/lib/adapters/api/auth";
import { hasLoginValidationErrors, validateLoginInput } from "@/lib/usecases/auth";
import { authBackendBaseUrl } from "@/lib/server/auth-session";
import { setAuthCookie } from "@/lib/server/auth-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  readonly email?: unknown;
  readonly password?: unknown;
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const validation = validateLoginInput({
    email: typeof body.email === "string" ? body.email : "",
    password: typeof body.password === "string" ? body.password : "",
  });
  if (hasLoginValidationErrors(validation)) {
    return NextResponse.json({ error: "invalid_credentials", fields: validation }, { status: 400 });
  }
  const credentials = validation as { email: string; password: string };

  try {
    const result = await loginToBackend({
      baseUrl: authBackendBaseUrl(),
      email: credentials.email,
      password: credentials.password,
    });
    const response = NextResponse.json({ session: result.session });
    setAuthCookie(response, result.accessToken);
    return response;
  } catch (err) {
    return NextResponse.json(
      { error: "login_failed", detail: err instanceof Error ? err.message : "unknown" },
      { status: 401 },
    );
  }
}
