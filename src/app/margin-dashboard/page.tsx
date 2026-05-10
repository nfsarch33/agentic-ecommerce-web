import type { Metadata } from "next";
import { MarginDashboard } from "@/components/MarginDashboard";
import { adminPageMetadata } from "@/lib/seo-metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...adminPageMetadata({
    title: "Margin Dashboard | Agentic Ecommerce Admin",
    description:
      "Unified margin view: revenue, supplier costs, shipping, platform fees, ROI, competitor positioning, and 30-day forecast.",
    canonical: "/margin-dashboard",
  }),
};

export default function MarginDashboardPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-950">Margin dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          v3.9.0 EC-6-5 -- per-tenant margin view joining orders, supplier costs, shipping labels, ROI rollup,
          and the v3.9.0 EC-6-4 competitor price feed. Default window: 30 days.
        </p>
      </header>
      <MarginDashboard period="30d" />
    </main>
  );
}
