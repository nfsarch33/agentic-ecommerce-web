import type { Metadata } from "next";
import { UsageProgressBar } from "@/components/UsageProgressBar";
import { adminPageMetadata } from "@/lib/seo-metadata";
import { getBillingUsage, BillingApiError } from "@/lib/adapters/api/billing";
import type { UsageReport } from "@/lib/domain/billing";
import { requireServerSession } from "@/lib/server/auth-session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...adminPageMetadata({
    title: "Usage | Agentic Ecommerce Admin",
    description: "Per-metric usage rollup for the current period with plan limits.",
    canonical: "/admin/billing/usage",
  }),
};

const DEFAULT_TENANT_ID = "tenant_default";

export default async function BillingUsagePage() {
  await requireServerSession();
  const baseUrl = process.env.MC_API_BASE_URL ?? "http://localhost:8080";
  const tenantId = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID ?? DEFAULT_TENANT_ID;
  let report: UsageReport | null = null;
  let error: string | undefined;
  try {
    report = await getBillingUsage({ baseUrl, tenantId });
  } catch (err) {
    error = err instanceof BillingApiError ? err.message : "Failed to load usage report.";
  }
  return (
    <section
      data-testid="billing-usage-page"
      className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
    >
      <header>
        <h2 className="text-xl font-semibold tracking-tight">Current period usage</h2>
        {report ? (
          <p className="text-sm text-slate-600">
            Plan {report.plan} · {report.periodStart.slice(0, 10)} → {report.periodEnd.slice(0, 10)}
          </p>
        ) : null}
      </header>
      {error ? (
        <p data-testid="billing-usage-error" className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      ) : null}
      {report ? (
        <div className="space-y-4">
          {report.rollups.map((r) => (
            <UsageProgressBar key={r.metric} rollup={r} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
