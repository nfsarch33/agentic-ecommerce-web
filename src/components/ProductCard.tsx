import { formatMoney, isInStock, type ProductFields } from "@/lib/domain/product";

export interface ProductCardProps {
  readonly product: ProductFields;
}

export function ProductCard({ product }: ProductCardProps) {
  const inStock = isInStock(product);
  return (
    <article
      className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
      data-testid={`product-${product.id}`}
    >
      <h2 className="text-lg font-semibold tracking-tight">{product.title}</h2>
      <p className="text-sm text-gray-600">{product.description ?? ""}</p>
      <p className="text-base font-medium">{formatMoney(product.price)}</p>
      <p className={inStock ? "text-sm text-green-700" : "text-sm text-red-700"}>
        {inStock ? "In stock" : "Out of stock"}
      </p>
      <button
        type="button"
        disabled={!inStock}
        className="mt-1 rounded-md bg-[var(--color-brand-500)] px-3 py-1.5 text-sm text-white hover:bg-[var(--color-brand-700)] disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        Add to cart
      </button>
    </article>
  );
}
