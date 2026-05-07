import type { Metadata } from "next";
import { ComplianceDashboard } from "@/components/ComplianceDashboard";
import { loadComplianceDashboard } from "@/lib/usecases/compliance-dashboard";
import { adminPageMetadata } from "@/lib/seo-metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...adminPageMetadata({
    title: "Compliance Dashboard | Agentic Ecommerce Admin",
    description: "Review product compliance rules, AI content checks, and unresolved policy findings.",
    canonical: "/admin/compliance",
  }),
};

export default async function CompliancePage() {
  const serverBaseUrl = process.env.MC_API_BASE_URL ?? "http://localhost:8080";
  const clientBaseUrl = process.env.NEXT_PUBLIC_MC_API_BASE_URL ?? serverBaseUrl;
  let dashboard: Awaited<ReturnType<typeof loadComplianceDashboard>>;

  try {
    dashboard = await loadComplianceDashboard({ baseUrl: serverBaseUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to load compliance dashboard.";
    return (
      <ComplianceDashboard
        apiBaseUrl={clientBaseUrl}
        products={[]}
        rules={[]}
        initialResults={[]}
        initialError={message}
      />
    );
  }

  const { products, rules, results, reportSummary, customRules } = dashboard;
  const serializableProducts = products.map((product) => ({
    id: product.id,
    sku: product.sku,
    title: product.title,
    slug: product.slug,
    price: product.price,
    stock: product.stock,
    description: product.description,
  }));

  return (
    <ComplianceDashboard
      apiBaseUrl={clientBaseUrl}
      products={serializableProducts}
      rules={rules}
      initialResults={results}
      reportSummary={reportSummary}
      customRules={customRules}
    />
  );
}
