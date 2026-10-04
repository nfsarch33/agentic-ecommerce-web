import type { Metadata } from "next";
import { requireServerSession } from "@/lib/server/auth-session";
import { adminPageMetadata } from "@/lib/seo-metadata";
import { loadWorkflowList } from "@/lib/usecases/workflows";
import { loadApprovalProducts } from "@/lib/usecases/approval-products";
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
  // MC_API_BASE_URL is server-only: the browser talks same-origin to the
  // BFF route, so no API base (and no default) is ever serialised into
  // the RSC payload. An unset variable fails here as a deployment error.
  const baseUrl = process.env.MC_API_BASE_URL;
  if (!baseUrl) {
    throw new Error("approvals: MC_API_BASE_URL is not configured");
  }
  // The usecase throws on failure (the adapter surfaces the API error);
  // Next's error boundary renders it. The inbox itself treats an empty
  // queue as a success state.
  const { workflows } = await loadWorkflowList({ baseUrl, status: "waiting_review" });
  // The summary API carries no product_title on this backend yet, so the
  // product (title, SKU, draft description) is joined here server-side;
  // a failed join degrades to the raw product id per row.
  const products = await loadApprovalProducts({
    baseUrl,
    productIds: workflows.map((w) => w.productId),
  });
  return <ApprovalsInbox workflows={[...workflows]} products={products} />;
}
