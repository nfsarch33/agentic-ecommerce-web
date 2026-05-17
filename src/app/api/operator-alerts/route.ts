// File scope: v3.9.1 EC-9-5 BFF operator alert centre proxy.
//
// Forwards GET /api/v1/operator/alerts and the per-alert
// acknowledge/resolve POSTs to the backend. The browser cannot
// attach the Bearer header directly, so this BFF route forwards
// the JWT cookie as Cookie. Mirrors the v3.9.0 EC-6-5 margin BFF
// proxy and the v3.6.0 EC-9-2 SSE proxy patterns.

import { dispatchOperatorAlertProxy } from "./proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  return dispatchOperatorAlertProxy(request);
}

export async function POST(request: Request): Promise<Response> {
  return dispatchOperatorAlertProxy(request);
}
