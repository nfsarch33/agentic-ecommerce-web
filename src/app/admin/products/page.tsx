import type { Metadata } from "next";
import { ProductManagement } from "@/components/ProductManagement";
import { fetchProducts } from "@/lib/adapters/api/products";
import { listProducts } from "@/lib/usecases/list-products";
import { requireServerSession } from "@/lib/server/auth-session";
import { adminPageMetadata } from "@/lib/seo-metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...adminPageMetadata({
    title: "Product Management | Agentic Ecommerce Admin",
    description: "Review catalog inventory, stock, pricing, and product content workflow entry points.",
    canonical: "/admin/products",
  }),
};

export default async function ProductsAdminPage() {
  const session = await requireServerSession();
  const { products } = await listProducts(
    { onlyInStock: false },
    { fetchProductsImpl: fetchProducts },
  );

  return <ProductManagement products={products} userRole={session.user.role} />;
}
