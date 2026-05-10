import { NextResponse } from "next/server";

// File scope: v3.9.1 Existing #10 BFF onboarding wizard proxy.
//
// The onboarding wizard issues four kinds of requests to the backend:
//
//   * POST /api/v1/onboarding/start
//   * GET  /api/v1/onboarding/{wizard_id}/state
//   * POST /api/v1/onboarding/{wizard_id}/step/{step_num}
//   * POST /api/v1/onboarding/{wizard_id}/complete
//
// The browser cannot set the JWT-Bearer header directly, so the BFF
// route forwards the request to the backend with the JWT cookie
// attached. This route maps any path/method the wizard client uses
// onto the corresponding backend endpoint with no buffering --
// matching the v3.6.0 SSE proxy + v3.9.0 margin BFF patterns.
//
// Tenant scoping: the X-Tenant-Id header is forwarded if the caller
// set it; otherwise the backend derives the tenant from the JWT.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function backendBaseUrl(): string {
  return (
    process.env.MC_API_BASE_URL ??
    process.env.NEXT_PUBLIC_MC_API_BASE_URL ??
    "http://localhost:8080"
  );
}

interface ProxyOptions {
  readonly request: Request;
  readonly upstreamPath: string;
}

async function proxy({ request, upstreamPath }: ProxyOptions): Promise<Response> {
  const incoming = new URL(request.url);
  const target = new URL(`${backendBaseUrl()}${upstreamPath}`);
  for (const [key, value] of incoming.searchParams) {
    target.searchParams.set(key, value);
  }

  const headers = new Headers();
  headers.set("Accept", "application/json");
  const tenant = request.headers.get("x-tenant-id");
  if (tenant) headers.set("X-Tenant-Id", tenant);
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("Cookie", cookie);
  const contentType = request.headers.get("content-type");
  if (contentType && request.method !== "GET") headers.set("Content-Type", contentType);

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      method: request.method,
      headers,
      body:
        request.method === "GET" || request.method === "HEAD"
          ? undefined
          : await request.text(),
      cache: "no-store",
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "upstream_unreachable",
        detail: err instanceof Error ? err.message : "unknown",
      },
      { status: 502 },
    );
  }
  const responseBody = await upstream.text();
  return new Response(responseBody, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
  });
}

function deriveUpstreamPath(request: Request): string | null {
  const url = new URL(request.url);
  const pathname = url.pathname;
  // Map the BFF /api/onboarding/* tail onto the backend
  // /api/v1/onboarding/* hierarchy. Reject any other prefix so a
  // misconfigured rewrite cannot use this BFF as an open proxy.
  const prefix = "/api/onboarding";
  if (!pathname.startsWith(prefix)) {
    return null;
  }
  const tail = pathname.slice(prefix.length);
  if (tail === "" || tail === "/") {
    return "/api/v1/onboarding";
  }
  return `/api/v1/onboarding${tail}`;
}

async function dispatch(request: Request): Promise<Response> {
  const upstreamPath = deriveUpstreamPath(request);
  if (!upstreamPath) {
    return NextResponse.json({ error: "unknown_route" }, { status: 404 });
  }
  return proxy({ request, upstreamPath });
}

export async function GET(request: Request): Promise<Response> {
  return dispatch(request);
}

export async function POST(request: Request): Promise<Response> {
  return dispatch(request);
}
