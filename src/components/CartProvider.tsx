"use client";

import { createContext, useContext, useMemo, useReducer, type Dispatch, type ReactNode } from "react";
import { cartReducer, computeCartTotals, emptyCartState, type CartAction, type CartState } from "@/lib/domain/cart";

interface CartContextValue {
  readonly state: CartState;
  readonly dispatch: Dispatch<CartAction>;
  readonly itemCount: number;
  readonly totals: ReturnType<typeof computeCartTotals>;
}

const CartContext = createContext<CartContextValue | null>(null);

export interface CartProviderProps {
  readonly children: ReactNode;
  readonly initialState?: CartState;
}

export function CartProvider({ children, initialState = emptyCartState }: CartProviderProps) {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const value = useMemo<CartContextValue>(
    () => ({
      state,
      dispatch,
      itemCount: state.items.reduce((sum, item) => sum + item.quantity, 0),
      totals: computeCartTotals(state),
    }),
    [state],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const value = useContext(CartContext);
  if (!value) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return value;
}
