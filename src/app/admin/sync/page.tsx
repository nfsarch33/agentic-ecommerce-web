import { SyncDashboard } from "@/components/SyncDashboard";
import { loadSyncDashboard } from "@/lib/usecases/load-sync-dashboard";

export const dynamic = "force-dynamic";

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
