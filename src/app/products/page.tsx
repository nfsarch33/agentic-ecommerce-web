import { ProductList } from "@/components/ProductList";
import { listProducts } from "@/lib/usecases/list-products";
import { fetchProducts } from "@/lib/adapters/api/products";

// Force dynamic rendering for now: products come from the live backend
// each request. Once we add caching at the BFF route handler we can
// switch to ISR or revalidate-on-demand.
export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const { products } = await listProducts(
    { onlyInStock: false },
    { fetchProductsImpl: fetchProducts },
  );
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Products</h1>
        <p className="mt-2 text-sm text-gray-600">
          Live inventory from the Agentic Ecommerce Mission Control API.
        </p>
      </header>
      <ProductList products={products} />
    </main>
  );
}
