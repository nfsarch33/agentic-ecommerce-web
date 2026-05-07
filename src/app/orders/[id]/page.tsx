import type { Metadata } from "next";
import { OrderConfirmation } from "@/components/OrderConfirmation";
import { fetchOrder } from "@/lib/adapters/api/orders";
import { privatePageMetadata } from "@/lib/seo-metadata";

export const dynamic = "force-dynamic";

interface OrderConfirmationPageProps {
  readonly params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: OrderConfirmationPageProps): Promise<Metadata> {
  const { id } = await params;
  return privatePageMetadata({
    title: `Order ${id} | Agentic Ecommerce`,
    description: "Review a private order confirmation and checkout receipt.",
    canonical: `/orders/${id}`,
  });
}

export default async function OrderConfirmationPage({ params }: OrderConfirmationPageProps) {
  const { id } = await params;
  const order = await fetchOrder({
    baseUrl: process.env.MC_API_BASE_URL ?? "http://localhost:8080",
    orderId: id,
  });

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <OrderConfirmation order={order} />
    </main>
  );
}
