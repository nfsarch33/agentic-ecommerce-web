import type { Metadata } from "next";
import { listTenantsUsecase } from "@/lib/usecases/provision-tenant";
import { TenantManagement } from "@/components/TenantManagement";
import { requireServerSession } from "@/lib/server/auth-session";
import { adminPageMetadata } from "@/lib/seo-metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...adminPageMetadata({
    title: "Tenants | Agentic Ecommerce Admin",
    description: "Provision tenants, manage their lifecycle, and review the tenant aggregate.",
    canonical: "/admin/tenants",
  }),
};

export default async function TenantsAdminPage() {
  await requireServerSession();
  const baseUrl = process.env.MC_API_BASE_URL ?? "http://localhost:8080";
  const result = await listTenantsUsecase({ baseUrl });
  return <TenantManagement tenants={result.tenants} baseUrl={baseUrl} />;
}
