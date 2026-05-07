import Link from "next/link";
import { requireServerSession } from "@/lib/server/auth-session";
import { canViewAdminNavItem } from "@/lib/domain/auth";
import { EventActivityFeed } from "@/components/EventActivityFeed";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const session = await requireServerSession();
  const serverBaseUrl = process.env.MC_API_BASE_URL ?? "http://localhost:8080";
  const clientBaseUrl = process.env.NEXT_PUBLIC_MC_API_BASE_URL ?? serverBaseUrl;
  const cards = [
    {
      key: "products",
      title: "Products",
      href: "/admin/products",
      description: "Review catalog inventory.",
    },
    {
      key: "orders",
      title: "Orders",
      href: "/admin/orders",
      description: "Look up customer orders.",
    },
    { key: "agents", title: "Agents", href: "/admin/agents", description: "Monitor agent runs." },
    {
      key: "settings",
      title: "Settings",
      href: "/admin/settings",
      description: "Review server-side config status.",
    },
  ].filter((card) => canViewAdminNavItem(session.user, card.key));

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8">
        <p className="text-sm font-medium uppercase tracking-wide text-gray-500">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Admin Dashboard</h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          Signed in as {session.user.email}. Your {session.user.role} role controls which dashboard
          tools are visible.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2" aria-label="Admin dashboard sections">
        {cards.map((card) => (
          <Link
            key={card.key}
            href={card.href}
            className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:border-[var(--color-brand-500)]"
          >
            <h2 className="text-lg font-semibold">{card.title}</h2>
            <p className="mt-2 text-sm text-gray-600">{card.description}</p>
          </Link>
        ))}
      </section>

      <div className="mt-8">
        <EventActivityFeed apiBaseUrl={clientBaseUrl} />
      </div>
    </main>
  );
}
