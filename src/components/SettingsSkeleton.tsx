import Link from "next/link";

export type ConfigStatus = "configured" | "not_configured";

export interface SettingsSection {
  readonly name: string;
  readonly status: ConfigStatus;
  readonly description: string;
  readonly href?: string;
  readonly actionLabel?: string;
}

export interface SettingsSkeletonProps {
  readonly sections: readonly SettingsSection[];
}

function statusLabel(status: ConfigStatus): string {
  return status === "configured" ? "Configured" : "Not configured";
}

export function SettingsSkeleton({ sections }: SettingsSkeletonProps) {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-8">
        <p className="text-sm font-medium uppercase tracking-wide text-gray-500">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          Configuration status for API, WooCommerce, and agent services. Values stay server-side and are never
          rendered in this UI.
        </p>
      </header>

      <section className="grid gap-4">
        {sections.map((section) => (
          <article key={section.name} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">{section.name}</h2>
                <p className="mt-2 text-sm text-gray-600">{section.description}</p>
                {section.href && (
                  <Link
                    href={section.href}
                    className="mt-3 inline-flex text-sm font-medium text-[var(--color-brand-700)] hover:text-[var(--color-brand-500)]"
                  >
                    {section.actionLabel ?? `Open ${section.name}`}
                  </Link>
                )}
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  section.status === "configured"
                    ? "bg-green-50 text-green-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {statusLabel(section.status)}
              </span>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
