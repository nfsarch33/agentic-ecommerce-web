import type { CartState } from "@/lib/domain/cart";
import type { ShippingAddress } from "@/lib/domain/order";
import type { CreateOrderRequest, DeliveryOption } from "@/lib/adapters/api/orders";

export interface BuildCheckoutOrderInput {
  readonly cart: CartState;
  readonly customerEmail: string;
  readonly deliveryOption: DeliveryOption;
  readonly idempotencyKey: string;
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
    deliveryOption: input.deliveryOption,
    idempotencyKey: input.idempotencyKey,
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
