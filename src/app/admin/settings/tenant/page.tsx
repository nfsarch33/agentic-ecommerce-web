import type { Metadata } from "next";
import { TenantSettingsPanel } from "@/components/TenantSettingsPanel";
import { requireServerSession } from "@/lib/server/auth-session";
import { loadTenantSettings } from "@/lib/usecases/tenant-settings";
import { adminPageMetadata } from "@/lib/seo-metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...adminPageMetadata({
    title: "Tenant Settings | Agentic Ecommerce Admin",
    description: "Configure tenant branding and compliance preferences without exposing backend credentials.",
    canonical: "/admin/settings/tenant",
  }),
};

export default async function TenantSettingsPage() {
  await requireServerSession("admin");

  const serverBaseUrl = process.env.MC_API_BASE_URL ?? "http://localhost:8080";
  const clientBaseUrl = process.env.NEXT_PUBLIC_MC_API_BASE_URL ?? serverBaseUrl;
  const settings = await loadTenantSettings({ baseUrl: serverBaseUrl });

  return <TenantSettingsPanel apiBaseUrl={clientBaseUrl} settings={settings} />;
}
