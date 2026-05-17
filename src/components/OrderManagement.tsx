import { canAccessRole, type Role } from "@/lib/domain/auth";
import { orderOperatorGuidance, type Order } from "@/lib/domain/order";
import { formatMoney } from "@/lib/domain/product";

export interface OrderManagementProps {
  readonly order?: Order;
  readonly lookupId?: string;
  readonly userRole: Role;
}

export function OrderManagement({ order, lookupId, userRole }: OrderManagementProps) {
  const canMutate = canAccessRole(userRole, "operator");
  const operatorGuidance = order ? orderOperatorGuidance(order.status) : null;
  const statusBadgeClassName = order ? orderStatusBadgeClassName(order.status) : "bg-blue-50 text-blue-700";

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-gray-500">Admin</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Order Management</h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-600">
            Look up orders through the existing order adapter. A list endpoint can replace this focused lookup once
            the backend contract adds admin pagination.
          </p>
        </div>
        {!canMutate && (
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
            View-only access
          </span>
        )}
      </header>

      <form className="mb-6 flex max-w-xl gap-3" action="/admin/orders">
        <label className="sr-only" htmlFor="order-id">Order ID</label>
        <input
          id="order-id"
          name="id"
          defaultValue={lookupId}
          placeholder="Order ID"
          className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-md bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white">
          Look up
        </button>
      </form>

      {!order ? (
        <p className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-600">
          Enter an order ID to inspect customer, item, and status details.
        </p>
      ) : (
        <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-gray-500">Order</p>
              <h2 className="mt-1 text-xl font-semibold">{order.id}</h2>
              <p className="mt-1 text-sm text-gray-600">{order.customerEmail}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClassName}`}>
              {order.status}
            </span>
          </div>

          <dl className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-md bg-gray-50 p-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Total</dt>
              <dd className="mt-1 text-sm font-semibold">{formatMoney(order.totals.total)}</dd>
            </div>
            <div className="rounded-md bg-gray-50 p-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Items</dt>
              <dd className="mt-1 text-sm font-semibold">{order.items.length}</dd>
            </div>
            <div className="rounded-md bg-gray-50 p-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Created</dt>
              <dd className="mt-1 text-sm font-semibold">{new Date(order.createdAt).toLocaleString("en-AU")}</dd>
            </div>
          </dl>

          {operatorGuidance && (
            <section className={`mt-6 rounded-md border p-4 ${operatorGuidance.toneClassName}`} role="note">
              <h3 className="text-sm font-semibold">{operatorGuidance.title}</h3>
              <p className="mt-1 text-sm">{operatorGuidance.description}</p>
            </section>
          )}

          <section className="mt-6">
            <h3 className="text-lg font-semibold">Items</h3>
            <div className="mt-3 divide-y divide-gray-100 rounded-md border border-gray-200">
              {order.items.length === 0 ? (
                <p className="p-4 text-sm text-gray-600">No items recorded for this order.</p>
              ) : (
                order.items.map((item) => (
                  <div key={`${item.productId}-${item.sku}`} className="flex justify-between gap-4 p-4 text-sm">
                    <span className="font-medium">{item.title}</span>
                    <span className="text-gray-600">
                      {item.quantity} x {formatMoney(item.unitPrice)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>

          {canMutate && (
            <button
              type="button"
              disabled
              className="mt-6 rounded-md bg-gray-300 px-4 py-2 text-sm font-medium text-white"
            >
              Fulfill order
            </button>
          )}
        </article>
      )}
    </main>
  );
}

function orderStatusBadgeClassName(status: Order["status"]): string {
  switch (status) {
    case "pending":
      return "bg-amber-50 text-amber-700";
    case "failed":
    case "cancelled":
      return "bg-red-50 text-red-700";
    default:
      return "bg-blue-50 text-blue-700";
  }
}
