import { NextResponse } from "next/server";

// File scope: v3.9.0 EC-6-5 BFF margin dashboard proxy.
//
// The browser fetch hits this Next.js route which forwards the
// request to the backend analytics_margin handler. Three upstream
// endpoints are merged into a single response so the client only
// has to render once. Mirrors the EC-9-2 BFF SSE proxy pattern.
//
// Tenant scoping: the X-Tenant-Id header is forwarded if the
// caller set it; otherwise the backend derives the tenant from
// the JWT.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function backendBaseUrl(): string {
  return process.env.MC_API_BASE_URL ?? process.env.NEXT_PUBLIC_MC_API_BASE_URL ?? "http://localhost:8080";
}

interface BackendCalls {
  readonly dashboard: Promise<Response>;
  readonly alerts: Promise<Response>;
  readonly forecast: Promise<Response>;
}

export async function GET(request: Request): Promise<Response> {
  const incoming = new URL(request.url);
  const params = new URLSearchParams(incoming.searchParams);
  // Default to 30d if not supplied; matches the backend handler.
  if (!params.has("period") && !params.has("from")) {
    params.set("period", "30d");
  }

  const headers = buildForwardHeaders(request);
  const calls = launchBackendCalls(headers, params);

  let dashboard: unknown;
  let alerts: unknown;
  let forecast: unknown;
  try {
    [dashboard, alerts, forecast] = await Promise.all([
      consumeJSON(calls.dashboard),
      consumeJSON(calls.alerts),
      consumeJSON(calls.forecast),
    ]);
  } catch (err) {
    return NextResponse.json(
      { error: "upstream_unreachable", detail: err instanceof Error ? err.message : "unknown" },
      { status: 502 },
    );
  }

  // Merge into a single envelope the client expects. Keep dashboard
  // top-level so the existing parseMarginEnvelope works without
  // extra unwrapping.
  if (isRecord(dashboard) && "error" in dashboard) {
    return NextResponse.json(dashboard, { status: 502 });
  }
  const merged: Record<string, unknown> = isRecord(dashboard) ? { ...dashboard } : { dashboard };
  if (isRecord(alerts)) merged.alerts = alerts.alerts ?? [];
  if (isRecord(forecast)) merged.forecast = forecast;
  return NextResponse.json(merged);
}

function launchBackendCalls(headers: Headers, params: URLSearchParams): BackendCalls {
  const base = backendBaseUrl();
  return {
    dashboard: fetch(`${base}/api/v1/analytics/margin/dashboard?${params.toString()}`, {
      method: "GET",
      headers,
      cache: "no-store",
    }),
    alerts: fetch(`${base}/api/v1/analytics/margin/alerts?${params.toString()}`, {
      method: "GET",
      headers,
      cache: "no-store",
    }),
    forecast: fetch(`${base}/api/v1/analytics/margin/forecast?${params.toString()}`, {
      method: "GET",
      headers,
      cache: "no-store",
    }),
  };
}

function buildForwardHeaders(request: Request): Headers {
  const headers = new Headers();
  headers.set("Accept", "application/json");
  const tenant = request.headers.get("x-tenant-id");
  if (tenant) headers.set("X-Tenant-Id", tenant);
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("Cookie", cookie);
  return headers;
}

async function consumeJSON(call: Promise<Response>): Promise<unknown> {
  const resp = await call;
  if (!resp.ok) {
    return { error: "upstream_status", status: resp.status };
  }
  try {
    return await resp.json();
  } catch {
    return { error: "upstream_decode" };
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
