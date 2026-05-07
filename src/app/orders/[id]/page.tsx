import { OrderConfirmation } from "@/components/OrderConfirmation";
import { fetchOrder } from "@/lib/adapters/api/orders";

export const dynamic = "force-dynamic";

interface OrderConfirmationPageProps {
  readonly params: Promise<{ id: string }>;
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
