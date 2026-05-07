import { NextResponse } from "next/server";
import { callDescribe, fleetBridgeUrl, MiniMaxFleetPolicyError } from "@/lib/adapters/api/ai-describe";

// BFF route handler for MiniMax-routed product descriptions.
//
// The browser POSTs to /api/ai-describe; this server-side handler
// resolves the Tailscale fleet bridge URL from FLEET_AI_BRIDGE_URL and
// proxies the call. The browser NEVER sees the bridge URL or any
// MiniMax token, and the runtime refuses any *.minimaxi.com or
// localhost target via fleetBridgeUrl validation.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  readonly prompt?: unknown;
  readonly productId?: unknown;
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const productId = typeof body.productId === "string" ? body.productId.trim() : "";
  if (prompt.length < 1 || productId.length < 1) {
    return NextResponse.json({ error: "prompt and productId are required" }, { status: 400 });
  }

  let bridgeUrl: string;
  try {
    bridgeUrl = fleetBridgeUrl({ FLEET_AI_BRIDGE_URL: process.env.FLEET_AI_BRIDGE_URL });
  } catch (err) {
    if (err instanceof MiniMaxFleetPolicyError) {
      return NextResponse.json(
        { error: "ai_routing_disabled", detail: err.message },
        { status: 503 },
      );
    }
    throw err;
  }

  try {
    const out = await callDescribe({ prompt, productId }, { bridgeUrl });
    return NextResponse.json(out);
  } catch (err) {
    return NextResponse.json(
      { error: "bridge_call_failed", detail: err instanceof Error ? err.message : "unknown" },
      { status: 502 },
    );
  }
}
