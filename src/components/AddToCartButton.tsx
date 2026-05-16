"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "./CartProvider";
import type { CartAddItem } from "@/lib/domain/cart";

export interface AddToCartButtonProps {
  readonly item: CartAddItem;
  readonly disabled?: boolean;
}

export function AddToCartButton({ item, disabled = false }: AddToCartButtonProps) {
  const router = useRouter();
  const { dispatch, state } = useCart();
  const added = state.items.some((cartItem) => cartItem.productId === item.productId);

  return (
    <div className="mt-1 flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          dispatch({ type: "addItem", item });
        }}
        className="rounded-md bg-[var(--color-brand-500)] px-3 py-1.5 text-sm text-white hover:bg-[var(--color-brand-700)] disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {added ? "Added to cart" : "Add to cart"}
      </button>
      {added && (
        <Link
          className="text-sm font-medium text-blue-700 hover:underline"
          href="/cart"
          onClick={(event) => {
            event.preventDefault();
            router.push("/cart");
          }}
        >
          View cart
        </Link>
      )}
    </div>
  );
}
