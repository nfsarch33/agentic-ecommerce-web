import type { Metadata } from "next";
import { getServerAccessToken, requireServerSession } from "@/lib/server/auth-session";
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
  // The backend's /api/v1/workflows and /api/v1/products reads are
  // RBAC-authed; these server-side fetches carry the session bearer
  // (the review BFF route does the same for the signal POST). Without
  // it the page 500s with WorkflowsApiError 401 the moment the backend
  // turns auth on — which is exactly how this was found.
  const accessToken = await getServerAccessToken();
  const authFetch: typeof fetch = (input, init) =>
    fetch(input, {
      ...init,
      headers: {
        ...(init?.headers as Record<string, string> | undefined),
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      },
    });
  // The usecase throws on failure (the adapter surfaces the API error);
  // Next's error boundary renders it. The inbox itself treats an empty
  // queue as a success state.
  const { workflows } = await loadWorkflowList(
    { baseUrl, status: "waiting_review" },
    { fetchImpl: authFetch },
  );
  // The summary API carries no product_title on this backend yet, so the
  // product (title, SKU, draft description) is joined here server-side;
  // a failed join degrades to the raw product id per row.
  const products = await loadApprovalProducts({
    baseUrl,
    productIds: workflows.map((w) => w.productId),
    fetch: authFetch,
  });
  return <ApprovalsInbox workflows={[...workflows]} products={products} />;
}
