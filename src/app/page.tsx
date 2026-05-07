import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">Agentic Ecommerce</h1>
      <p className="mt-4 text-lg text-gray-700">
        Public Next.js storefront paired with the private Go backend at
        <code className="mx-1 rounded bg-surface-muted px-1.5 py-0.5 text-sm">
          nfsarch33/agentic-ecommerce
        </code>
        .
      </p>
      <p className="mt-6 text-sm text-gray-500">
        AI-routed actions always proxy through the Tailscale fleet bridge — never direct.
      </p>
      <div className="mt-10 flex gap-4">
        <Link
          href="/products"
          className="rounded-md bg-[var(--color-brand-500)] px-4 py-2 text-white hover:bg-[var(--color-brand-700)]"
        >
          Browse products
        </Link>
      </div>
    </main>
  );
}
