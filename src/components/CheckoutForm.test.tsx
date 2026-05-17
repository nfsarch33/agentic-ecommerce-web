import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CheckoutForm } from "./CheckoutForm";
import { CartProvider } from "./CartProvider";
import type { CartState } from "@/lib/domain/cart";
import type { Order } from "@/lib/domain/order";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const cartWithItem: CartState = {
  items: [
    {
      productId: "018f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c",
      sku: "ROLLER-001",
      title: "Foam roller",
      slug: "foam-roller",
      quantity: 1,
      unitPrice: { amount: 3500, currency: "AUD" },
    },
  ],
};

const createdOrder: Order = {
  id: "218f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c",
  customerEmail: "buyer@example.com",
  status: "pending",
  shippingAddress: {
    name: "Buyer Example",
    line1: "1 Market Street",
    city: "Sydney",
    region: "NSW",
    postalCode: "2000",
    country: "AU",
  },
  items: [
    {
      productId: "018f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c",
      sku: "ROLLER-001",
      title: "Foam roller",
      quantity: 1,
      unitPrice: { amount: 3500, currency: "AUD" },
      lineTotal: { amount: 3500, currency: "AUD" },
    },
  ],
  totals: {
    subtotal: { amount: 3500, currency: "AUD" },
    shipping: { amount: 0, currency: "AUD" },
    total: { amount: 3500, currency: "AUD" },
  },
  createdAt: "2026-05-07T04:00:00Z",
  updatedAt: "2026-05-07T04:00:00Z",
};

describe("CheckoutForm", () => {
  beforeEach(() => {
    push.mockReset();
  });

  it("shows an empty-cart guard instead of the checkout form", () => {
    render(
      <CartProvider>
        <CheckoutForm apiBaseUrl="http://api.test" />
      </CartProvider>,
    );

    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /place order/i })).not.toBeInTheDocument();
  });

  it("validates email and shipping address fields before submitting", async () => {
    const createOrderImpl = vi.fn();
    render(
      <CartProvider initialState={cartWithItem}>
        <CheckoutForm apiBaseUrl="http://api.test" createOrderImpl={createOrderImpl} />
      </CartProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: /place order/i }));

    expect(await screen.findByText(/enter a valid email/i)).toBeInTheDocument();
    expect(screen.getByText(/full name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/address line 1 is required/i)).toBeInTheDocument();
    expect(createOrderImpl).not.toHaveBeenCalled();
  });

  it("submits the cart with a payment stub and navigates to confirmation", async () => {
    const createOrderImpl = vi.fn().mockResolvedValue(createdOrder);
    render(
      <CartProvider initialState={cartWithItem}>
        <CheckoutForm apiBaseUrl="http://api.test" createOrderImpl={createOrderImpl} />
      </CartProvider>,
    );

    await userEvent.type(screen.getByLabelText(/email/i), "buyer@example.com");
    await userEvent.type(screen.getByLabelText(/full name/i), "Buyer Example");
    await userEvent.type(screen.getByLabelText(/address line 1/i), "1 Market Street");
    await userEvent.type(screen.getByLabelText(/city/i), "Sydney");
    await userEvent.type(screen.getByLabelText(/state or region/i), "NSW");
    await userEvent.type(screen.getByLabelText(/postal code/i), "2000");
    await userEvent.click(screen.getByRole("button", { name: /place order/i }));

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/orders/218f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c"),
    );
    expect(createOrderImpl).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: "http://api.test",
        order: expect.objectContaining({
          customerEmail: "buyer@example.com",
          deliveryOption: "standard",
          idempotencyKey: expect.any(String),
          items: [
            expect.objectContaining({
              sku: "ROLLER-001",
            }),
          ],
        }),
      }),
    );
  });

  it("ignores a second submit while the first checkout request is still in flight", async () => {
    let resolveOrder: ((order: Order) => void) | undefined;
    const createOrderImpl = vi.fn().mockImplementation(
      () =>
        new Promise<Order>((resolve) => {
          resolveOrder = resolve;
        }),
    );
    render(
      <CartProvider initialState={cartWithItem}>
        <CheckoutForm apiBaseUrl="http://api.test" createOrderImpl={createOrderImpl} />
      </CartProvider>,
    );

    await userEvent.type(screen.getByLabelText(/email/i), "buyer@example.com");
    await userEvent.type(screen.getByLabelText(/full name/i), "Buyer Example");
    await userEvent.type(screen.getByLabelText(/address line 1/i), "1 Market Street");
    await userEvent.type(screen.getByLabelText(/city/i), "Sydney");
    await userEvent.type(screen.getByLabelText(/state or region/i), "NSW");
    await userEvent.type(screen.getByLabelText(/postal code/i), "2000");

    const button = screen.getByRole("button", { name: /place order/i });
    const form = button.closest("form");
    if (!(form instanceof HTMLFormElement)) {
      throw new Error("checkout form not found");
    }

    fireEvent.submit(form);
    fireEvent.submit(form);

    await waitFor(() => expect(createOrderImpl).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: /placing order/i })).toBeDisabled();

    resolveOrder?.(createdOrder);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/orders/218f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c"));
  });

  it("reuses the same idempotency key after an interrupted submit and surfaces safe retry guidance", async () => {
    const idempotencyKeys: string[] = [];
    const createOrderImpl = vi
      .fn()
      .mockImplementationOnce(async (opts: { order: { idempotencyKey: string } }) => {
        idempotencyKeys.push(opts.order.idempotencyKey);
        throw new Error("network dropped before confirmation");
      })
      .mockImplementationOnce(async (opts: { order: { idempotencyKey: string } }) => {
        idempotencyKeys.push(opts.order.idempotencyKey);
        return createdOrder;
      });

    render(
      <CartProvider initialState={cartWithItem}>
        <CheckoutForm apiBaseUrl="http://api.test" createOrderImpl={createOrderImpl} />
      </CartProvider>,
    );

    await userEvent.type(screen.getByLabelText(/email/i), "buyer@example.com");
    await userEvent.type(screen.getByLabelText(/full name/i), "Buyer Example");
    await userEvent.type(screen.getByLabelText(/address line 1/i), "1 Market Street");
    await userEvent.type(screen.getByLabelText(/city/i), "Sydney");
    await userEvent.type(screen.getByLabelText(/state or region/i), "NSW");
    await userEvent.type(screen.getByLabelText(/postal code/i), "2000");

    const button = screen.getByRole("button", { name: /place order/i });
    await userEvent.click(button);

    expect(await screen.findByRole("alert")).toHaveTextContent(/retrying will reuse your existing checkout attempt/i);

    await userEvent.click(screen.getByRole("button", { name: /place order/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/orders/218f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c"));
    expect(idempotencyKeys).toHaveLength(2);
    expect(idempotencyKeys[1]).toBe(idempotencyKeys[0]);
  });
});
