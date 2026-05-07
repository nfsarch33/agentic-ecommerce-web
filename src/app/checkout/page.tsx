import { CheckoutForm } from "@/components/CheckoutForm";

export default function CheckoutPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Checkout</h1>
        <p className="mt-2 text-sm text-gray-600">
          Enter shipping details and use the v0.2.0 payment stub to place your order.
        </p>
      </header>
      <CheckoutForm apiBaseUrl={process.env.NEXT_PUBLIC_MC_API_BASE_URL ?? "http://localhost:8080"} />
    </main>
  );
}
