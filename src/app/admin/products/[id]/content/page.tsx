import type { Metadata } from "next";
import { AIProductDescriptionPanel } from "@/components/AIProductDescriptionPanel";
import { ProductMediaPanel } from "@/components/ProductMediaPanel";
import { loadProductMedia } from "@/lib/usecases/media-library";
import { loadProductContentEditor } from "@/lib/usecases/product-content-editor";
import { adminPageMetadata } from "@/lib/seo-metadata";

export const dynamic = "force-dynamic";

interface ProductContentPageProps {
  readonly params: Promise<{ readonly id: string }>;
}

export async function generateMetadata({ params }: ProductContentPageProps): Promise<Metadata> {
  const { id } = await params;
  return adminPageMetadata({
    title: `Product Content ${id} | Agentic Ecommerce Admin`,
    description: "Generate AI product copy and start the durable product publish workflow.",
    canonical: `/admin/products/${id}/content`,
  });
}

export default async function ProductContentPage({ params }: ProductContentPageProps) {
  const { id } = await params;
  const serverBaseUrl = process.env.MC_API_BASE_URL ?? "http://localhost:8080";
  const clientBaseUrl = process.env.NEXT_PUBLIC_MC_API_BASE_URL ?? serverBaseUrl;
  const [contentState, media] = await Promise.all([
    loadProductContentEditor({
      baseUrl: serverBaseUrl,
      productId: id,
    }),
    loadProductMedia({
      baseUrl: serverBaseUrl,
      productId: id,
    }),
  ]);
  const { product, suggestions, suggestionsError } = contentState;
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
    <>
      <AIProductDescriptionPanel
        apiBaseUrl={clientBaseUrl}
        product={productFields}
        initialSuggestions={suggestions}
        initialError={suggestionsError}
        fallbackBffBaseUrl=""
      />
      <ProductMediaPanel apiBaseUrl={clientBaseUrl} productId={id} initialAssets={media.assets} />
    </>
  );
}
