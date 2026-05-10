import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function backendBaseUrl(): string {
  return (
    process.env.MC_API_BASE_URL ??
    process.env.NEXT_PUBLIC_MC_API_BASE_URL ??
    "http://localhost:8080"
  );
}

export async function GET(request: Request): Promise<Response> {
  const incoming = new URL(request.url);
  const target = new URL(`${backendBaseUrl()}/api/v1/payments`);
  for (const [key, value] of incoming.searchParams) {
    target.searchParams.set(key, value);
  }

  const headers = new Headers();
  headers.set("Accept", "application/json");
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
