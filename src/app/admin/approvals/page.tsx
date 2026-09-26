import type { Metadata } from "next";
import { requireServerSession } from "@/lib/server/auth-session";
import { adminPageMetadata } from "@/lib/seo-metadata";
import { loadWorkflowList } from "@/lib/usecases/workflows";
import { ApprovalsInbox } from "@/components/ApprovalsInbox";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...adminPageMetadata({
    title: "Approvals | Agentic Ecommerce Admin",
    description: "Approve, reject with a reason, or batch-approve agent work waiting for review.",
    canonical: "/admin/approvals",
  }),
};

export default async function ApprovalsAdminPage() {
  await requireServerSession();
  const baseUrl = process.env.MC_API_BASE_URL ?? "http://localhost:8080";
  // The usecase throws on failure (the adapter surfaces the API error);
  // Next's error boundary renders it. The inbox itself treats an empty
  // queue as a success state.
  const { workflows } = await loadWorkflowList({ baseUrl, status: "waiting_review" });
  return <ApprovalsInbox workflows={[...workflows]} />;
}
