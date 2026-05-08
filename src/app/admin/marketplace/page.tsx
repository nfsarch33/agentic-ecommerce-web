import type { Metadata } from "next";
import { listMarketplacePluginsUsecase } from "@/lib/usecases/list-marketplace-plugins";
import { MarketplaceCatalog } from "@/components/MarketplaceCatalog";
import { requireServerSession } from "@/lib/server/auth-session";
import { adminPageMetadata } from "@/lib/seo-metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...adminPageMetadata({
    title: "Marketplace | Agentic Ecommerce Admin",
    description: "Browse marketplace plugins, install for the active tenant, and review per-plugin settings.",
    canonical: "/admin/marketplace",
  }),
};

const DEFAULT_TENANT_ID = "tenant_default";

export default async function MarketplaceAdminPage() {
  await requireServerSession();
  const baseUrl = process.env.MC_API_BASE_URL ?? "http://localhost:8080";
  const tenantId = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID ?? DEFAULT_TENANT_ID;
  const result = await listMarketplacePluginsUsecase({ baseUrl, tenantId });
  return <MarketplaceCatalog plugins={result.plugins} error={result.error} />;
}
