import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AddToCartButton } from "./AddToCartButton";
import { CartProvider } from "./CartProvider";
import type { CartAddItem, CartState } from "@/lib/domain/cart";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
}));

const item: CartAddItem = {
  productId: "018f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c",
  sku: "ROLLER-001",
  title: "Foam roller",
  slug: "foam-roller",
  unitPrice: { amount: 3500, currency: "AUD" },
};

function renderButton(props: Partial<Parameters<typeof AddToCartButton>[0]> = {}, initialState?: CartState) {
  return render(
    <CartProvider initialState={initialState}>
      <AddToCartButton item={item} {...props} />
    </CartProvider>,
  );
}

describe("AddToCartButton", () => {
  it("renders an enabled add-to-cart button by default", () => {
    renderButton();
    const button = screen.getByRole("button", { name: /^add to cart$/i });
    expect(button).toBeEnabled();
    expect(screen.queryByRole("link", { name: /view cart/i })).toBeNull();
  });

  it("respects the disabled prop", () => {
    renderButton({ disabled: true });
    expect(screen.getByRole("button", { name: /^add to cart$/i })).toBeDisabled();
  });

  it("dispatches addItem and reveals the View cart shortcut after a click", async () => {
    const user = userEvent.setup();
    renderButton();
    await user.click(screen.getByRole("button", { name: /^add to cart$/i }));

    expect(screen.getByRole("button", { name: /added to cart/i })).toBeInTheDocument();
    const viewCart = screen.getByRole("link", { name: /view cart/i });
    expect(viewCart).toHaveAttribute("href", "/cart");
  });

  it("shows the cart shortcut when the item is already in the cart state", () => {
    renderButton(
      {},
      {
        items: [{ ...item, quantity: 1 }],
      },
    );

    expect(screen.getByRole("button", { name: /added to cart/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view cart/i })).toHaveAttribute("href", "/cart");
  });

  it("client-side navigates via router.push when View cart is clicked", async () => {
    const user = userEvent.setup();
    push.mockReset();
    renderButton();
    await user.click(screen.getByRole("button", { name: /^add to cart$/i }));
    await user.click(screen.getByRole("link", { name: /view cart/i }));
    expect(push).toHaveBeenCalledWith("/cart");
  });
});
