import type { Metadata } from "next";
import { TenantWizardSteps } from "@/components/TenantWizardSteps";
import { requireServerSession } from "@/lib/server/auth-session";
import { adminPageMetadata } from "@/lib/seo-metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...adminPageMetadata({
    title: "Provision tenant | Agentic Ecommerce Admin",
    description: "Provisioning wizard for new tenants.",
    canonical: "/admin/tenants/new",
  }),
};

export default async function NewTenantPage() {
  await requireServerSession();
  const baseUrl = process.env.MC_API_BASE_URL ?? "http://localhost:8080";
  return <TenantWizardSteps baseUrl={baseUrl} />;
}
