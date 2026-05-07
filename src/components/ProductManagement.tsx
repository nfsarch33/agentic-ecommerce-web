import { formatMoney, type ProductFields } from "@/lib/domain/product";
import { canAccessRole, type Role } from "@/lib/domain/auth";

export interface ProductManagementProps {
  readonly products: readonly ProductFields[];
  readonly userRole: Role;
}

export function ProductManagement({ products, userRole }: ProductManagementProps) {
  const canMutate = canAccessRole(userRole, "operator");

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-gray-500">Admin</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Product Management</h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-600">
            Review product inventory from the existing catalog adapter. Create/edit actions stay disabled until the
            backend mutation contract is finalized.
          </p>
        </div>
        {canMutate ? (
          <button
            type="button"
            disabled
            className="rounded-md bg-gray-300 px-4 py-2 text-sm font-medium text-white"
          >
            Create product
          </button>
        ) : (
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
            View-only access
          </span>
        )}
      </header>

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th scope="col" className="px-4 py-3">SKU</th>
              <th scope="col" className="px-4 py-3">Product</th>
              <th scope="col" className="px-4 py-3">Price</th>
              <th scope="col" className="px-4 py-3">Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map((product) => (
              <tr key={product.id}>
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{product.sku}</td>
                <td className="px-4 py-3 font-medium text-gray-950">{product.title}</td>
                <td className="px-4 py-3 text-gray-700">{formatMoney(product.price)}</td>
                <td className="px-4 py-3 text-gray-700">{product.stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
