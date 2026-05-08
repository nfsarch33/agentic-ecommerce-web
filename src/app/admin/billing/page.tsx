import type { Metadata } from "next";
import { BillingDashboard } from "@/components/BillingDashboard";
import { adminPageMetadata } from "@/lib/seo-metadata";
import { listBillingSubscriptions, BillingApiError } from "@/lib/adapters/api/billing";
import { requireServerSession } from "@/lib/server/auth-session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...adminPageMetadata({
    title: "Billing | Agentic Ecommerce Admin",
    description: "Subscriptions, invoices, and current-period usage for the active tenant.",
    canonical: "/admin/billing",
  }),
};

const DEFAULT_TENANT_ID = "tenant_default";

export default async function BillingDashboardPage() {
  await requireServerSession();
  const baseUrl = process.env.MC_API_BASE_URL ?? "http://localhost:8080";
  const tenantId = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID ?? DEFAULT_TENANT_ID;
  let subscriptions = [] as Awaited<ReturnType<typeof listBillingSubscriptions>>["subscriptions"];
  let error: string | undefined;
  try {
    const result = await listBillingSubscriptions({ baseUrl, tenantId, perPage: 50 });
    subscriptions = result.subscriptions;
  } catch (err) {
    error = err instanceof BillingApiError ? err.message : "Failed to load billing dashboard.";
  }
  return (
    <BillingDashboard
      baseUrl={baseUrl}
      tenantId={tenantId}
      subscriptions={subscriptions}
      error={error}
    />
  );
}
