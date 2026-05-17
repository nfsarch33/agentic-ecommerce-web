import { NextResponse } from "next/server";

export function backendBaseUrl(): string {
  return (
    process.env.MC_API_BASE_URL ??
    process.env.NEXT_PUBLIC_MC_API_BASE_URL ??
    "http://localhost:8080"
  );
}

export function deriveUpstreamPath(request: Request): string | null {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const prefix = "/api/operator-alerts";
  if (!pathname.startsWith(prefix)) {
    return null;
  }

  const tail = pathname.slice(prefix.length);
  if (tail === "" || tail === "/") {
    return "/api/v1/operator/alerts";
  }
  return `/api/v1/operator/alerts${tail}`;
}

export async function dispatchOperatorAlertProxy(request: Request): Promise<Response> {
  const upstreamPath = deriveUpstreamPath(request);
  if (!upstreamPath) {
    return NextResponse.json({ error: "unknown_route" }, { status: 404 });
  }

  const incoming = new URL(request.url);
  const target = new URL(`${backendBaseUrl()}${upstreamPath}`);
  for (const [key, value] of incoming.searchParams) {
    target.searchParams.set(key, value);
  }

  const headers = new Headers();
  headers.set("Accept", "application/json");
  const tenant = request.headers.get("x-tenant-id");
  if (tenant) {
    headers.set("X-Tenant-Id", tenant);
  }
  const cookie = request.headers.get("cookie");
  if (cookie) {
    headers.set("Cookie", cookie);
  }

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.text(),
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

  const body = await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
  });
}
