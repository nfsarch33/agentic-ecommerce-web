import type { Metadata } from "next";
import { PaymentDashboard } from "@/components/PaymentDashboard";
import { adminPageMetadata } from "@/lib/seo-metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...adminPageMetadata({
    title: "Payments | Agentic Ecommerce Admin",
    description:
      "v4.3.0 -- multi-provider payment dashboard with real-time status, provider breakdown, and tenant filtering.",
    canonical: "/payments",
  }),
};

export default function PaymentsPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-950">Payments</h1>
        <p className="mt-1 text-sm text-gray-600">
          Multi-provider payment dashboard. Filter by provider, status, and tenant.
        </p>
      </header>
      <PaymentDashboard />
    </main>
  );
}
