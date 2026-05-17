import Link from "next/link";
import { formatMoney } from "@/lib/domain/product";
import { orderStatusPresentation, type Order } from "@/lib/domain/order";

export interface OrderConfirmationProps {
  readonly order: Order;
}

export function OrderConfirmation({ order }: OrderConfirmationProps) {
  const presentation = orderStatusPresentation(order.status);

  return (
    <section className="grid gap-8">
      <header>
        <p className={`text-sm font-medium uppercase tracking-wide ${presentation.toneClassName}`}>{presentation.eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{presentation.title}</h1>
        <dl className="mt-4 grid gap-2 text-sm text-gray-700">
          <div>
            <dt className="font-medium">Order ID</dt>
            <dd>{order.id}</dd>
          </div>
          <div>
            <dt className="font-medium">Status</dt>
            <dd className="capitalize">{order.status}</dd>
          </div>
          <div>
            <dt className="font-medium">Email</dt>
            <dd>{order.customerEmail}</dd>
          </div>
        </dl>
      </header>
      <section className="rounded-lg border border-gray-200 p-4">
        <h2 className="font-semibold">Items</h2>
        {order.items.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">No line items were returned for this order.</p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-200">
            {order.items.map((item) => (
              <li className="flex items-center justify-between py-3" key={item.productId}>
                <span>
                  {item.title} x {item.quantity}
                </span>
                <span>{formatMoney(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="rounded-lg border border-gray-200 p-4">
        <h2 className="font-semibold">Shipping</h2>
        <address className="mt-3 not-italic text-gray-700">
          {order.shippingAddress.name}
          <br />
          {order.shippingAddress.line1}
          {order.shippingAddress.line2 && (
            <>
              <br />
              {order.shippingAddress.line2}
            </>
          )}
          <br />
          {order.shippingAddress.city}, {order.shippingAddress.region} {order.shippingAddress.postalCode}
          <br />
          {order.shippingAddress.country}
        </address>
      </section>
      <footer className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
        <span className="text-lg font-semibold">Total</span>
        <span className="text-lg font-semibold">{formatMoney(order.totals.total)}</span>
      </footer>
      <Link className="text-sm text-blue-600 hover:underline" href="/products">
        Continue shopping
      </Link>
    </section>
  );
}
