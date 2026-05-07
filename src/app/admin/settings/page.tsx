import type { Metadata } from "next";
import { SettingsSkeleton, type SettingsSection } from "@/components/SettingsSkeleton";
import { requireServerSession } from "@/lib/server/auth-session";
import { adminPageMetadata } from "@/lib/seo-metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...adminPageMetadata({
    title: "Settings | Agentic Ecommerce Admin",
    description: "Review non-secret configuration readiness for API, WooCommerce, and agent integrations.",
    canonical: "/admin/settings",
  }),
};

function configured(value: string | undefined): SettingsSection["status"] {
  return value && value.trim() !== "" ? "configured" : "not_configured";
}

export default async function SettingsPage() {
  await requireServerSession("admin");

  const sections: SettingsSection[] = [
    {
      name: "API",
      status: configured(process.env.MC_API_BASE_URL),
      description: "Backend API base URL is available to server-side BFF and admin pages.",
    },
    {
      name: "WooCommerce",
      status: configured(process.env.WOOCOMMERCE_CONFIGURED),
      description: "Store integration status only. Credentials remain in backend infrastructure.",
    },
    {
      name: "Agents",
      status: configured(process.env.AGENT_SCHEDULER_CONFIGURED),
      description: "Agent scheduler integration status for sourcing, content, pricing, and compliance workers.",
    },
    {
      name: "Tenant",
      status: "configured",
      description: "Branding, locale, AI tone, and compliance preferences for the active tenant.",
      href: "/admin/settings/tenant",
      actionLabel: "Open tenant settings",
    },
  ];

  return <SettingsSkeleton sections={sections} />;
}
