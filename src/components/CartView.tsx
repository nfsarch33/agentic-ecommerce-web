"use client";

import Link from "next/link";
import { useState } from "react";
import { formatMoney } from "@/lib/domain/product";
import { CartValidationError } from "@/lib/domain/cart";
import { useCart } from "./CartProvider";

export function CartView() {
  const { state, dispatch, totals } = useCart();
  const [error, setError] = useState<string | null>(null);
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});

  if (state.items.length === 0) {
    return (
      <section className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Your cart</h1>
        <p className="mt-4 text-gray-600">Your cart is empty.</p>
        <Link className="mt-6 inline-flex text-sm text-blue-600 hover:underline" href="/products">
          Browse products
        </Link>
      </section>
    );
  }

  return (
    <section>
      <h1 className="text-3xl font-semibold tracking-tight">Your cart</h1>
      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      <ul className="mt-8 divide-y divide-gray-200 rounded-lg border border-gray-200">
        {state.items.map((item) => (
          <li className="grid gap-4 p-4 sm:grid-cols-[1fr_auto_auto]" key={item.productId}>
            <div>
              <h2 className="font-medium">{item.title}</h2>
              <p className="text-sm text-gray-600">{formatMoney(item.unitPrice)} each</p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              Qty
              <input
                aria-label={`Quantity for ${item.title}`}
                className="w-20 rounded-md border border-gray-300 px-2 py-1"
                min={1}
                type="number"
                value={quantityDrafts[item.productId] ?? String(item.quantity)}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setQuantityDrafts((current) => ({ ...current, [item.productId]: value }));
                  if (value === "") return;
                  const quantity = Number(value);
                  if (!Number.isInteger(quantity) || quantity < 1) {
                    setError(new CartValidationError("quantity must be a positive integer").message);
                    return;
                  }
                  dispatch({ type: "updateQuantity", productId: item.productId, quantity });
                  setQuantityDrafts((current) => {
                    const next = { ...current };
                    delete next[item.productId];
                    return next;
                  });
                  setError(null);
                }}
              />
            </label>
            <button
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
              type="button"
              onClick={() => dispatch({ type: "removeItem", productId: item.productId })}
            >
              Remove {item.title}
            </button>
          </li>
        ))}
      </ul>
      <footer className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xl font-semibold">
          Subtotal: {formatMoney({ amount: totals.subtotal, currency: totals.currency })}
        </p>
        <div className="flex gap-3">
          <button
            className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
            type="button"
            onClick={() => dispatch({ type: "clear" })}
          >
            Clear cart
          </button>
          <Link className="rounded-md bg-[var(--color-brand-500)] px-4 py-2 text-sm text-white" href="/checkout">
            Checkout
          </Link>
        </div>
      </footer>
    </section>
  );
}
