import Link from "next/link";
import type { Metadata } from "next";
import { fetchProductBySlug } from "@/lib/adapters/api/products";
import { formatMoney, isInStock } from "@/lib/domain/product";
import { publicPageMetadata } from "@/lib/seo-metadata";

export const dynamic = "force-dynamic";

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  return publicPageMetadata({
    title: `${slug.replace(/-/g, " ")} | Agentic Ecommerce`,
    description: "View product details, pricing, and stock status in the Agentic Ecommerce storefront.",
    canonical: `/products/${slug}`,
  });
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  const product = await fetchProductBySlug({
    baseUrl: process.env.MC_API_BASE_URL ?? "http://localhost:8080",
    slug,
  });

  const inStock = isInStock(product);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <nav className="mb-6">
        <Link href="/products" className="text-sm text-blue-600 hover:underline">
          &larr; Back to products
        </Link>
      </nav>
      <article>
        <h1 className="text-3xl font-semibold tracking-tight">{product.title}</h1>
        {product.description && (
          <p className="mt-4 text-gray-700">{product.description}</p>
        )}
        <p className="mt-4 text-2xl font-medium">{formatMoney(product.price)}</p>
        <p className={`mt-2 text-sm ${inStock ? "text-green-700" : "text-red-700"}`}>
          {inStock ? "In stock" : "Out of stock"}
        </p>
        <button
          type="button"
          disabled={!inStock}
          className="mt-6 rounded-md bg-[var(--color-brand-500)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-700)] disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          Add to cart
        </button>
      </article>
    </main>
  );
}
