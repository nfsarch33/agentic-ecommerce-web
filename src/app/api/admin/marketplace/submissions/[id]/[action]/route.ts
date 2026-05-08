import { NextResponse } from "next/server";
import {
  approveSubmissionUsecase,
  rejectSubmissionUsecase,
} from "@/lib/usecases/review-submission";

// BFF route handler for super-admin submission review actions.
//
// The Next.js client posts to /api/admin/marketplace/submissions/{id}/approve
// or /reject; this server-side handler proxies the call to mc-api so
// the browser never holds the mc-api admin bearer token directly.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  readonly review_notes?: unknown;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; action: string }> },
): Promise<NextResponse> {
  const { id, action } = await params;
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }
  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    // Empty body is allowed; review notes are optional.
  }
  const reviewNotes = typeof body.review_notes === "string" ? body.review_notes : "";
  const baseUrl = process.env.MC_API_BASE_URL ?? "http://localhost:8080";
  const usecase = action === "approve" ? approveSubmissionUsecase : rejectSubmissionUsecase;
  const result = await usecase({ baseUrl, id, reviewNotes });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json({ submission: result.submission });
}
