import type { Metadata } from "next";
import { WebhookManagement } from "@/components/WebhookManagement";
import { requireServerSession } from "@/lib/server/auth-session";
import { loadWebhookSettings } from "@/lib/usecases/webhooks";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Webhooks | Agentic Ecommerce Admin",
  description: "Register outbound webhook destinations and monitor n8n automation status.",
  alternates: {
    canonical: "/admin/settings/webhooks",
  },
};

export default async function WebhookSettingsPage() {
  await requireServerSession("admin");

  const serverBaseUrl = process.env.MC_API_BASE_URL ?? "http://localhost:8080";
  const clientBaseUrl = process.env.NEXT_PUBLIC_MC_API_BASE_URL ?? serverBaseUrl;
  const settings = await loadWebhookSettings({ baseUrl: serverBaseUrl });

  return (
    <WebhookManagement
      apiBaseUrl={clientBaseUrl}
      webhooks={settings.webhooks}
      automationStatuses={settings.automationStatuses}
    />
  );
}
