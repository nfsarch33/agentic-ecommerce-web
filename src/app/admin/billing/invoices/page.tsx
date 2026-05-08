import type { Metadata } from "next";
import { InvoiceTable } from "@/components/InvoiceTable";
import { adminPageMetadata } from "@/lib/seo-metadata";
import { listBillingInvoices, BillingApiError } from "@/lib/adapters/api/billing";
import { requireServerSession } from "@/lib/server/auth-session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...adminPageMetadata({
    title: "Invoices | Agentic Ecommerce Admin",
    description: "Tenant-scoped Stripe invoices with status, amount, and period.",
    canonical: "/admin/billing/invoices",
  }),
};

const DEFAULT_TENANT_ID = "tenant_default";

export default async function BillingInvoicesPage() {
  await requireServerSession();
  const baseUrl = process.env.MC_API_BASE_URL ?? "http://localhost:8080";
  const tenantId = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID ?? DEFAULT_TENANT_ID;
  let invoices = [] as Awaited<ReturnType<typeof listBillingInvoices>>["invoices"];
  let error: string | undefined;
  try {
    const result = await listBillingInvoices({ baseUrl, tenantId, perPage: 50 });
    invoices = result.invoices;
  } catch (err) {
    error = err instanceof BillingApiError ? err.message : "Failed to load invoices.";
  }
  return (
    <section
      data-testid="billing-invoices-page"
      className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
    >
      <header>
        <h2 className="text-xl font-semibold tracking-tight">Invoices</h2>
      </header>
      {error ? (
        <p data-testid="billing-invoices-error" className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      ) : (
        <InvoiceTable invoices={invoices} />
      )}
    </section>
  );
}
