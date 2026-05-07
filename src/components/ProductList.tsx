import type { ProductFields } from "@/lib/domain/product";
import { ProductCard } from "./ProductCard";

export interface ProductListProps {
  readonly products: readonly ProductFields[];
}

export function ProductList({ products }: ProductListProps) {
  if (products.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-gray-300 p-8 text-center text-gray-500">
        No products available right now.
      </p>
    );
  }
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
