import { ComplianceDashboard } from "@/components/ComplianceDashboard";
import { loadComplianceDashboard } from "@/lib/usecases/compliance-dashboard";

export const dynamic = "force-dynamic";

export default async function CompliancePage() {
  const serverBaseUrl = process.env.MC_API_BASE_URL ?? "http://localhost:8080";
  const clientBaseUrl = process.env.NEXT_PUBLIC_MC_API_BASE_URL ?? serverBaseUrl;
  const { products, rules, results } = await loadComplianceDashboard({ baseUrl: serverBaseUrl });
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
    />
  );
}
