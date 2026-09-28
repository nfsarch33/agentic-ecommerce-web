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
// operator identity server-side (the ec_session cookie never becomes a
// URL or a client-visible base) and forwards through the generated-schema
// adapter. MC_API_BASE_URL is server-only by design — it must never leak
// into the RSC payload, so there is deliberately no NEXT_PUBLIC fallback
// and no default: an unset variable is a 500 deployment error.
//
// Defence order (each check runs before anything that costs an upstream
// call, so every rejection below reaches 0 upstream requests):
//   415 wrong content-type · 403 cross-site Origin/Sec-Fetch-Site
//   400 malformed body / bad signal / bad workflow id
//   401 unauthenticated (local cookie or upstream 401/403)
//   422 reject reason missing, or the API itself refused as invalid
//
// mc-api wiring (checked against its security.go/workflow_handlers.go):
// /api/v1/workflows/** is mounted behind withRBAC(workflowRole) and the
// access token authenticates it, so the route forwards the original
// bearer; the reviewer field travels in the signal body, set from the
// verified session, never from the browser.

const MIN_REASON_CHARS = 3;
const WORKFLOW_ID_PATTERN = /^[A-Za-z0-9_.:-]{1,200}$/;

interface RouteContext {
  readonly params: Promise<{ readonly id: string }>;
}

/** Same-origin check for a cookie-authenticated state-changing POST:
 * accept a matching Origin header OR an explicit Sec-Fetch-Site. */
function isSameOrigin(request: Request): boolean {
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite === "same-origin") return true;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

async function currentSession(
  request: Request,
  baseUrl: string,
): Promise<{ session: Session | null; accessToken: string | null }> {
  const accessToken = readAuthTokenFromRequest(request);
  if (!accessToken) return { session: null, accessToken: null };
  try {
    const session = await fetchBackendSession({ baseUrl, accessToken, cache: "no-store" });
    return { session, accessToken };
  } catch {
    return { session: null, accessToken: null };
  }
}

export async function POST(request: Request, ctx: RouteContext): Promise<NextResponse> {
  const baseUrl = process.env.MC_API_BASE_URL;
  if (!baseUrl) {
    return NextResponse.json({ error: "MC_API_BASE_URL is not configured" }, { status: 500 });
  }
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return NextResponse.json({ error: "content-type must be application/json" }, { status: 415 });
  }
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "cross-site requests are refused" }, { status: 403 });
  }
  const { session, accessToken } = await currentSession(request, baseUrl);
  if (!session || !canAccessRole(session.user.role, "operator")) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (id === "." || id === ".." || !WORKFLOW_ID_PATTERN.test(id)) {
    return NextResponse.json({ error: "invalid workflow id" }, { status: 400 });
  }

  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return NextResponse.json({ error: "body must be JSON" }, { status: 400 });
  }
  const body = (parsed ?? {}) as { signal?: unknown; note?: unknown; reviewer?: unknown };
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
  // A browser-supplied reviewer is never trusted: the identity is the
  // verified session's, full stop.
  const reviewer = session.user.email;

  const idempotencyKey = request.headers.get("idempotency-key") ?? undefined;
  const fetchWithIdentity: typeof fetch = (input, init) =>
    fetch(input, {
      ...init,
      headers: {
        ...(init?.headers as Record<string, string> | undefined),
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}),
      },
    });

  try {
    await sendWorkflowReviewSignal({
      baseUrl,
      workflowId: id,
      signal: body.signal,
      reviewer,
      ...(note ? { note } : {}),
      fetchImpl: fetchWithIdentity,
    });
    return NextResponse.json({ status: "signaled" }, { status: 202 });
  } catch (err) {
    if (err instanceof WorkflowsApiError) {
      if (err.status === 404 || err.status === 409) {
        return NextResponse.json({ error: "review_signal_decided_elsewhere" }, { status: err.status });
      }
      // The API saw the request and answered: 400/422 is its own
      // "invalid, do not retry"; 401/403 means the operator's token is
      // no longer valid upstream; other statuses are refusals to retry.
      if (err.status === 400 || err.status === 422) {
        return NextResponse.json({ error: "review_signal_invalid" }, { status: 422 });
      }
      if (err.status === 401 || err.status === 403) {
        return NextResponse.json({ error: "review_signal_signin" }, { status: 401 });
      }
      if (err.status !== undefined) {
        return NextResponse.json({ error: "review_signal_refused" }, { status: 502 });
      }
      // A cause means the transport failed (the adapter wraps the
      // original throw); no cause and no status means the API answered
      // but broke the response contract. Both are retryable families
      // for the caller, on different copy.
      return NextResponse.json(
        { error: err.cause !== undefined ? "review_signal_unreachable" : "review_signal_refused" },
        { status: err.cause !== undefined ? 503 : 502 },
      );
    }
    return NextResponse.json({ error: "review_signal_unreachable" }, { status: 503 });
  }
}
