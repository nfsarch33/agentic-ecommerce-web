"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "./CartProvider";
import type { CartAddItem } from "@/lib/domain/cart";

export interface AddToCartButtonProps {
  readonly item: CartAddItem;
  readonly disabled?: boolean;
}

export function AddToCartButton({ item, disabled = false }: AddToCartButtonProps) {
  const { dispatch } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <div className="mt-1 flex items-center gap-3">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          dispatch({ type: "addItem", item });
          setAdded(true);
        }}
        className="rounded-md bg-[var(--color-brand-500)] px-3 py-1.5 text-sm text-white hover:bg-[var(--color-brand-700)] disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {added ? "Added to cart" : "Add to cart"}
      </button>
      {added && (
        <Link className="text-sm text-blue-600 hover:underline" href="/cart">
          View cart
        </Link>
      )}
    </div>
  );
}
