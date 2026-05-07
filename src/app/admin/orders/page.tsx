import { OrderManagement } from "@/components/OrderManagement";
import { fetchOrder } from "@/lib/adapters/api/orders";
import { requireServerSession } from "@/lib/server/auth-session";
import type { Order } from "@/lib/domain/order";

export const dynamic = "force-dynamic";

interface OrdersAdminPageProps {
  readonly searchParams?: Promise<{ readonly id?: string }>;
}

export default async function OrdersAdminPage({ searchParams }: OrdersAdminPageProps) {
  const session = await requireServerSession();
  const params = searchParams ? await searchParams : {};
  const lookupId = typeof params.id === "string" ? params.id.trim() : "";
  let order: Order | undefined;

  if (lookupId) {
    order = await fetchOrder({
      baseUrl: process.env.MC_API_BASE_URL ?? "http://localhost:8080",
      orderId: lookupId,
    });
  }

  return <OrderManagement order={order} lookupId={lookupId} userRole={session.user.role} />;
}
