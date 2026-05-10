import type { Metadata } from "next";
import nextDynamic from "next/dynamic";
import { adminPageMetadata } from "@/lib/seo-metadata";

const OperatorAlertCentre = nextDynamic(
  () => import("@/components/OperatorAlertCentre").then((m) => m.OperatorAlertCentre),
  {
    loading: () => (
      <div className="animate-pulse rounded-md border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-400">
        Loading operator alerts...
      </div>
    ),
  },
);

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...adminPageMetadata({
    title: "Operator alert centre | Agentic Ecommerce Admin",
    description:
      "v3.9.1 EC-9-5 -- centralised dashboard for the eight operator-actionable events (refund/dropship/price-change pending approval, CAPTCHA, OmniParser unavailable, rate-limit drain, channel status failure, large margin alert).",
    canonical: "/operator-alerts",
  }),
};

export default function OperatorAlertsPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-950">Operator alert centre</h1>
        <p className="mt-1 text-sm text-gray-600">
          v3.9.1 EC-9-5 -- centralised view of all operator-actionable events. Acknowledge, approve,
          or deny pending alerts. Lifecycle: pending → acknowledged → resolved (or expired after 24h).
        </p>
      </header>
      <OperatorAlertCentre status="pending" />
    </main>
  );
}
