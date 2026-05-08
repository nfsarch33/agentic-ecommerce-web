import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchTenant, TenantsApiError } from "@/lib/adapters/api/tenants";
import { TenantManagement } from "@/components/TenantManagement";
import { requireServerSession } from "@/lib/server/auth-session";
import { adminPageMetadata } from "@/lib/seo-metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return adminPageMetadata({
    title: `${id} | Tenants | Agentic Ecommerce Admin`,
    description: `Tenant detail for ${id}.`,
    canonical: `/admin/tenants/${id}`,
  });
}

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireServerSession();
  const { id } = await params;
  const baseUrl = process.env.MC_API_BASE_URL ?? "http://localhost:8080";
  try {
    const tenant = await fetchTenant({ baseUrl, id });
    return <TenantManagement tenants={[tenant]} baseUrl={baseUrl} />;
  } catch (err) {
    if (err instanceof TenantsApiError && err.status === 404) {
      notFound();
    }
    throw err;
  }
}
