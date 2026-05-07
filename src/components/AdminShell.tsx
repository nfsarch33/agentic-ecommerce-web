import Link from "next/link";
import { canViewAdminNavItem, type User } from "@/lib/domain/auth";
import { LogoutButton } from "./LogoutButton";

interface AdminNavItem {
  readonly key: string;
  readonly href: string;
  readonly label: string;
  readonly external?: boolean;
}

const navItems: readonly AdminNavItem[] = [
  { key: "dashboard", href: "/admin", label: "Dashboard" },
  { key: "products", href: "/admin/products", label: "Products" },
  { key: "media", href: "/admin/media", label: "Media" },
  { key: "orders", href: "/admin/orders", label: "Orders" },
  { key: "sync", href: "/admin/sync", label: "Sync" },
  { key: "agents", href: "/admin/agents", label: "Agents" },
  { key: "workflows", href: "/admin/workflows", label: "Workflows" },
  { key: "compliance", href: "/admin/compliance", label: "Compliance" },
  { key: "settings", href: "/admin/settings", label: "Settings" },
];

export interface AdminShellProps {
  readonly user: User;
  readonly children: React.ReactNode;
}

export function AdminShell({ user, children }: AdminShellProps) {
  const n8nUrl = process.env.NEXT_PUBLIC_N8N_URL?.trim();
  const externalItems: readonly AdminNavItem[] = n8nUrl
    ? [{ key: "n8n", href: n8nUrl, label: "Open n8n", external: true }]
    : [];
  const visibleItems = [...navItems, ...externalItems].filter((item) => canViewAdminNavItem(user, item.key));
  const accessLabel = user.role === "viewer" ? "Viewer access" : `${user.role} access`;

  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="border-b border-gray-200 bg-white lg:fixed lg:inset-y-0 lg:left-0 lg:w-72 lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col gap-6 p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Agentic Ecommerce</p>
            <h1 className="mt-2 text-xl font-semibold text-gray-950">Admin Console</h1>
          </div>

          <nav aria-label="Admin navigation" className="grid gap-1">
            {visibleItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noreferrer" : undefined}
                className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-950"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{accessLabel}</p>
            <p className="break-all text-sm font-medium text-gray-900">{user.email}</p>
            <LogoutButton />
          </div>
        </div>
      </aside>
      <div className="lg:pl-72">{children}</div>
    </div>
  );
}
