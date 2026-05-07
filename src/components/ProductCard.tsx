import { formatMoney, isInStock, type ProductFields } from "@/lib/domain/product";
import { AddToCartButton } from "./AddToCartButton";

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
      <AddToCartButton
        disabled={!inStock}
        item={{
          productId: product.id,
          sku: product.sku,
          title: product.title,
          slug: product.slug,
          unitPrice: product.price,
        }}
      />
    </article>
  );
}
