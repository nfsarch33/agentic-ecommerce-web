import type { Metadata } from "next";
import { SyncDashboard } from "@/components/SyncDashboard";
import { loadSyncDashboard } from "@/lib/usecases/load-sync-dashboard";
import { adminPageMetadata } from "@/lib/seo-metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...adminPageMetadata({
    title: "WooCommerce Sync | Agentic Ecommerce Admin",
    description: "Monitor WooCommerce synchronization status, conflicts, and catalog integration health.",
    canonical: "/admin/sync",
  }),
};

export default async function SyncPage() {
  const serverBaseUrl = process.env.MC_API_BASE_URL ?? "http://localhost:8080";
  const clientBaseUrl = process.env.NEXT_PUBLIC_MC_API_BASE_URL ?? serverBaseUrl;
  const { status, conflicts } = await loadSyncDashboard({ baseUrl: serverBaseUrl });

  return (
    <SyncDashboard
      apiBaseUrl={clientBaseUrl}
      initialStatus={status}
      initialConflicts={conflicts}
    />
  );
}
