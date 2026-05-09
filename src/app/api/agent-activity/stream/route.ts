import { NextResponse } from "next/server";

// File scope: v3.6.0 EC-9-2 BFF SSE proxy.
//
// The browser EventSource cannot send a custom Authorization header,
// so the page hits this Next.js route which forwards the request to
// the backend SSE handler with the JWT cookie attached as a Bearer
// header (mirrors the auth pattern used by /api/auth/login). The
// upstream stream is piped directly back to the client without
// buffering -- the backend already does the heartbeat + drop-oldest
// bookkeeping.
//
// Tenant scoping: the X-Tenant-Id header is forwarded if the caller
// set it; otherwise the backend derives the tenant from the JWT.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function backendBaseUrl(): string {
  return process.env.MC_API_BASE_URL ?? process.env.NEXT_PUBLIC_MC_API_BASE_URL ?? "http://localhost:8080";
}

export async function GET(request: Request): Promise<Response> {
  const incoming = new URL(request.url);
  const target = new URL(`${backendBaseUrl()}/api/v1/agent-activity/stream`);
  for (const [key, value] of incoming.searchParams) {
    target.searchParams.set(key, value);
  }

  const headers = new Headers();
  headers.set("Accept", "text/event-stream");
  const tenant = request.headers.get("x-tenant-id");
  if (tenant) headers.set("X-Tenant-Id", tenant);
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("Cookie", cookie);

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      method: "GET",
      headers,
      cache: "no-store",
      // @ts-expect-error -- duplex required by the fetch streaming spec.
      duplex: "half",
      signal: request.signal,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "upstream_unreachable", detail: err instanceof Error ? err.message : "unknown" },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    return NextResponse.json(
      { error: "upstream_status", status: upstream.status },
      { status: upstream.status },
    );
  }
  if (!upstream.body) {
    return NextResponse.json({ error: "upstream_no_body" }, { status: 502 });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
