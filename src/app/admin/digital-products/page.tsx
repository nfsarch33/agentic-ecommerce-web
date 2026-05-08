import type { Metadata } from "next";
import { listDigitalProductsUsecase } from "@/lib/usecases/list-digital-products";
import { DigitalProductManagement } from "@/components/DigitalProductManagement";
import { requireServerSession } from "@/lib/server/auth-session";
import { adminPageMetadata } from "@/lib/seo-metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...adminPageMetadata({
    title: "Digital Products | Agentic Ecommerce Admin",
    description:
      "Manage digital products, upload artefacts, and review the catalogue of downloadable goods.",
    canonical: "/admin/digital-products",
  }),
};

const DEFAULT_TENANT_ID = "tenant_default";

export default async function DigitalProductsAdminPage() {
  const session = await requireServerSession();
  const baseUrl = process.env.MC_API_BASE_URL ?? "http://localhost:8080";
  const tenantId = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID ?? DEFAULT_TENANT_ID;

  const result = await listDigitalProductsUsecase({ baseUrl, tenantId });

  return (
    <DigitalProductManagement
      initialProducts={result.products}
      userRole={session.user.role}
      tenantId={tenantId}
      baseUrl={baseUrl}
      error={result.error}
    />
  );
}
