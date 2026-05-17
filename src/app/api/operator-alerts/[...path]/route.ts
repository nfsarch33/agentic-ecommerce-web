import { dispatchOperatorAlertProxy } from "../proxy";
import { requireServerSession } from "@/lib/server/auth-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  await requireServerSession("operator");
  return dispatchOperatorAlertProxy(request);
}
