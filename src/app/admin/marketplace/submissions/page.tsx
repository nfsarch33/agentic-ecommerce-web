import type { Metadata } from "next";
import { listSubmissionsUsecase } from "@/lib/usecases/review-submission";
import { SubmissionsQueue } from "@/components/SubmissionsQueue";
import { requireServerSession } from "@/lib/server/auth-session";
import { adminPageMetadata } from "@/lib/seo-metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...adminPageMetadata({
    title: "Plugin submissions | Agentic Ecommerce Admin",
    description: "Review pending marketplace plugin submissions and approve or reject them.",
    canonical: "/admin/marketplace/submissions",
  }),
};

export default async function SubmissionsAdminPage() {
  await requireServerSession();
  const baseUrl = process.env.MC_API_BASE_URL ?? "http://localhost:8080";
  const result = await listSubmissionsUsecase({ baseUrl, page: 1, perPage: 50 });
  if (!result.ok) {
    return <SubmissionsQueue submissions={[]} total={0} error={result.error} />;
  }
  return <SubmissionsQueue submissions={result.list.submissions} total={result.list.total} />;
}
