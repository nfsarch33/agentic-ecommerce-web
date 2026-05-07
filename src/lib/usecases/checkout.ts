import type { CartState } from "@/lib/domain/cart";
import type { ShippingAddress } from "@/lib/domain/order";
import type { CreateOrderRequest } from "@/lib/adapters/api/orders";

export interface BuildCheckoutOrderInput {
  readonly cart: CartState;
  readonly customerEmail: string;
  readonly shippingAddress: ShippingAddress;
}

export class CheckoutValidationError extends Error {
  override readonly name = "CheckoutValidationError";
}

export function buildCheckoutOrder(input: BuildCheckoutOrderInput): CreateOrderRequest {
  if (input.cart.items.length === 0) {
    throw new CheckoutValidationError("cart must contain at least one item");
  }
  return {
    customerEmail: input.customerEmail,
    shippingAddress: input.shippingAddress,
    items: input.cart.items.map((item) => ({
      productId: item.productId,
      sku: item.sku,
      title: item.title,
      slug: item.slug,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
  };
}
