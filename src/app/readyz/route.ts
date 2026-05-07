import { NextResponse } from "next/server";
import { deploymentReadiness } from "@/lib/server/deployment-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const readiness = deploymentReadiness();

  return NextResponse.json(
    {
      status: readiness.ready ? "ready" : "not_ready",
      service: "agentic-ecommerce-web",
      checks: readiness.checks,
    },
    {
      status: readiness.ready ? 200 : 503,
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}
