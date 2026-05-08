import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchMarketplacePlugin, MarketplaceApiError } from "@/lib/adapters/api/marketplace";
import { PluginDetailPanel } from "@/components/PluginDetailPanel";
import { requireServerSession } from "@/lib/server/auth-session";
import { adminPageMetadata } from "@/lib/seo-metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return adminPageMetadata({
    title: `${slug} | Marketplace | Agentic Ecommerce Admin`,
    description: `Marketplace plugin detail for ${slug}.`,
    canonical: `/admin/marketplace/${slug}`,
  });
}

const DEFAULT_TENANT_ID = "tenant_default";

export default async function PluginDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireServerSession();
  const { slug } = await params;
  const baseUrl = process.env.MC_API_BASE_URL ?? "http://localhost:8080";
  const tenantId = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID ?? DEFAULT_TENANT_ID;
  try {
    const manifest = await fetchMarketplacePlugin({ baseUrl, tenantId, slug });
    return <PluginDetailPanel manifest={manifest} baseUrl={baseUrl} tenantId={tenantId} />;
  } catch (err) {
    if (err instanceof MarketplaceApiError && err.status === 404) {
      notFound();
    }
    throw err;
  }
}
