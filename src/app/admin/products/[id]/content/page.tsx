import { AIProductDescriptionPanel } from "@/components/AIProductDescriptionPanel";
import { loadProductContentEditor } from "@/lib/usecases/product-content-editor";

export const dynamic = "force-dynamic";

interface ProductContentPageProps {
  readonly params: Promise<{ readonly id: string }>;
}

export default async function ProductContentPage({ params }: ProductContentPageProps) {
  const { id } = await params;
  const serverBaseUrl = process.env.MC_API_BASE_URL ?? "http://localhost:8080";
  const clientBaseUrl = process.env.NEXT_PUBLIC_MC_API_BASE_URL ?? serverBaseUrl;
  const { product, suggestions } = await loadProductContentEditor({
    baseUrl: serverBaseUrl,
    productId: id,
  });
  const productFields = {
    id: product.id,
    sku: product.sku,
    title: product.title,
    slug: product.slug,
    price: product.price,
    stock: product.stock,
    description: product.description,
  };

  return (
    <AIProductDescriptionPanel
      apiBaseUrl={clientBaseUrl}
      product={productFields}
      initialSuggestions={suggestions}
      fallbackBffBaseUrl=""
    />
  );
}
