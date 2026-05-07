import type { Money } from "./product";

export interface CartAddItem {
  readonly productId: string;
  readonly title: string;
  readonly slug: string;
  readonly unitPrice: Money;
}

export interface CartItem extends CartAddItem {
  readonly quantity: number;
}

export interface CartState {
  readonly items: readonly CartItem[];
}

export interface CartTotals {
  readonly subtotal: number;
  readonly currency: Money["currency"];
}

export type CartAction =
  | { readonly type: "addItem"; readonly item: CartAddItem; readonly quantity?: number }
  | { readonly type: "removeItem"; readonly productId: string }
  | { readonly type: "updateQuantity"; readonly productId: string; readonly quantity: number }
  | { readonly type: "clear" };

export class CartValidationError extends Error {
  override readonly name = "CartValidationError";
}

export const emptyCartState: CartState = { items: [] };

function assertQuantity(quantity: number): void {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new CartValidationError("quantity must be a positive integer");
  }
}

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "addItem": {
      const quantity = action.quantity ?? 1;
      assertQuantity(quantity);
      const existing = state.items.find((item) => item.productId === action.item.productId);
      if (!existing) {
        return { items: [...state.items, { ...action.item, quantity }] };
      }
      return {
        items: state.items.map((item) =>
          item.productId === action.item.productId ? { ...item, quantity: item.quantity + quantity } : item,
        ),
      };
    }
    case "removeItem":
      return { items: state.items.filter((item) => item.productId !== action.productId) };
    case "updateQuantity":
      assertQuantity(action.quantity);
      return {
        items: state.items.map((item) =>
          item.productId === action.productId ? { ...item, quantity: action.quantity } : item,
        ),
      };
    case "clear":
      return emptyCartState;
  }
}

export function computeCartTotals(state: CartState): CartTotals {
  const currency = state.items[0]?.unitPrice.currency ?? "AUD";
  for (const item of state.items) {
    if (item.unitPrice.currency !== currency) {
      throw new CartValidationError("cart cannot mix currencies");
    }
  }
  return {
    currency,
    subtotal: state.items.reduce((sum, item) => sum + item.unitPrice.amount * item.quantity, 0),
  };
}
