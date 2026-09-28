import { NextResponse } from "next/server";
import type { Session } from "@/lib/domain/auth";
import { canAccessRole } from "@/lib/domain/auth";
import { fetchBackendSession } from "@/lib/adapters/api/auth";
import { WorkflowsApiError, sendWorkflowReviewSignal } from "@/lib/adapters/api/workflows";
import { readAuthTokenFromRequest } from "@/lib/server/auth-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// File scope: approvals-inbox BFF for the review signal.
//
// The browser posts SAME-ORIGIN to this route; the route attaches the
// session server-side (the ec_session cookie never becomes a URL or a
// client-visible base) and forwards through the generated-schema adapter.
// MC_API_BASE_URL is server-only by design — it must never leak into the
// RSC payload, so there is deliberately no NEXT_PUBLIC fallback and no
// default: an unset variable is a 500 deployment error, not a silent
// localhost.
//
// Status mapping (the client classifies from these codes, not messages):
//   202 decided · 400 malformed · 401 unauthenticated · 422 reason missing
//   404/409 passed through (decided elsewhere) · 502 API refused · 503 API unreachable

const MIN_REASON_CHARS = 3;

interface RouteContext {
  readonly params: Promise<{ readonly id: string }>;
}

async function currentSession(request: Request, baseUrl: string): Promise<Session | null> {
  const accessToken = readAuthTokenFromRequest(request);
  if (!accessToken) return null;
  try {
    return await fetchBackendSession({ baseUrl, accessToken, cache: "no-store" });
  } catch {
    return null;
  }
}

export async function POST(request: Request, ctx: RouteContext): Promise<NextResponse> {
  const baseUrl = process.env.MC_API_BASE_URL;
  if (!baseUrl) {
    return NextResponse.json({ error: "MC_API_BASE_URL is not configured" }, { status: 500 });
  }
  const session = await currentSession(request, baseUrl);
  if (!session || !canAccessRole(session.user.role, "operator")) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { id } = await ctx.params;
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return NextResponse.json({ error: "body must be JSON" }, { status: 400 });
  }
  const body = (parsed ?? {}) as { signal?: unknown; note?: unknown };
  if (body.signal !== "approve" && body.signal !== "reject") {
    return NextResponse.json({ error: "signal must be approve or reject" }, { status: 400 });
  }
  if (body.note !== undefined && typeof body.note !== "string") {
    return NextResponse.json({ error: "note must be a string" }, { status: 400 });
  }
  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (body.signal === "reject" && note.length < MIN_REASON_CHARS) {
    return NextResponse.json(
      { error: `a reject requires a reason of at least ${MIN_REASON_CHARS} characters` },
      { status: 422 },
    );
  }

  try {
    await sendWorkflowReviewSignal({
      baseUrl,
      workflowId: id,
      signal: body.signal,
      ...(note ? { note } : {}),
    });
    return NextResponse.json({ status: "signaled" }, { status: 202 });
  } catch (err) {
    if (err instanceof WorkflowsApiError) {
      if (err.status === 404 || err.status === 409) {
        return NextResponse.json({ error: "review_signal_decided_elsewhere" }, { status: err.status });
      }
      // A cause means the transport failed (adapter wraps the original
      // throw); no cause and no status means the API answered but broke
      // the response contract. Both are retryable families for the caller.
      return NextResponse.json(
        { error: err.cause !== undefined ? "review_signal_unreachable" : "review_signal_refused" },
        { status: err.cause !== undefined ? 503 : 502 },
      );
    }
    return NextResponse.json({ error: "review_signal_unreachable" }, { status: 503 });
  }
}
