import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CartProvider } from "@/components/CartProvider";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import CheckoutPage from "./page";

describe("CheckoutPage", () => {
  it("renders checkout heading", () => {
    render(
      <CartProvider>
        <CheckoutPage />
      </CartProvider>,
    );

    expect(screen.getByRole("heading", { name: /checkout/i })).toBeInTheDocument();
  });
});
