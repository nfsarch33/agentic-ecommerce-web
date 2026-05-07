import type { Metadata } from "next";
import { CartView } from "@/components/CartView";
import { privatePageMetadata } from "@/lib/seo-metadata";

export const metadata: Metadata = {
  ...privatePageMetadata({
    title: "Cart | Agentic Ecommerce",
    description: "Review selected products before checkout in the Agentic Ecommerce storefront.",
    canonical: "/cart",
  }),
};

export default function CartPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <CartView />
    </main>
  );
}
