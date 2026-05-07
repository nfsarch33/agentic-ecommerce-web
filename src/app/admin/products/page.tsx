import { ProductManagement } from "@/components/ProductManagement";
import { fetchProducts } from "@/lib/adapters/api/products";
import { listProducts } from "@/lib/usecases/list-products";
import { requireServerSession } from "@/lib/server/auth-session";

export const dynamic = "force-dynamic";

export default async function ProductsAdminPage() {
  const session = await requireServerSession();
  const { products } = await listProducts(
    { onlyInStock: false },
    { fetchProductsImpl: fetchProducts },
  );

  return <ProductManagement products={products} userRole={session.user.role} />;
}
