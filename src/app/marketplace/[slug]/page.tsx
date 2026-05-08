import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MarketplaceApiError,
  fetchMarketplacePlugin,
} from "@/lib/adapters/api/marketplace";
import { publicPageMetadata } from "@/lib/seo-metadata";

export const dynamic = "force-dynamic";

interface PageProps {
  readonly params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    ...publicPageMetadata({
      title: `${slug} | Marketplace | Agentic Ecommerce`,
      description: `Plugin detail page for ${slug}. View manifest, vendor, version, and install instructions.`,
      canonical: `/marketplace/${slug}`,
    }),
  };
}

const PUBLIC_TENANT_ID = "tenant_public";

export default async function MarketplacePluginDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const baseUrl = process.env.MC_API_BASE_URL ?? "http://localhost:8080";
  const tenantId = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID ?? PUBLIC_TENANT_ID;
  let manifest;
  try {
    manifest = await fetchMarketplacePlugin({ baseUrl, tenantId, slug });
  } catch (err) {
    if (err instanceof MarketplaceApiError && err.status === 404) {
      notFound();
    }
    if (err instanceof MarketplaceApiError) {
      return (
        <main
          data-testid="marketplace-detail-error"
          className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-12"
        >
          <h1 className="text-2xl font-semibold text-slate-900">Plugin unavailable</h1>
          <p className="text-sm text-rose-700">{err.message}</p>
          <Link href="/marketplace" className="text-blue-700 underline">
            Back to marketplace
          </Link>
        </main>
      );
    }
    throw err;
  }

  return (
    <main
      data-testid={`marketplace-detail-${manifest.slug}`}
      className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-12"
    >
      <nav aria-label="Breadcrumbs" className="text-sm text-slate-500">
        <Link href="/marketplace" className="hover:text-slate-800">
          Marketplace
        </Link>
        {manifest.category ? (
          <>
            <span className="mx-2">/</span>
            <Link
              href={`/marketplace/categories/${manifest.category}`}
              className="hover:text-slate-800"
            >
              {manifest.category}
            </Link>
          </>
        ) : null}
        <span className="mx-2">/</span>
        <span className="text-slate-800">{manifest.slug}</span>
      </nav>

      <header className="flex flex-col gap-2 border-b border-slate-200 pb-4">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{manifest.name}</h1>
        <p className="text-sm text-slate-500">
          v{manifest.version} by {manifest.vendor}
        </p>
        {manifest.description ? (
          <p className="text-base text-slate-700">{manifest.description}</p>
        ) : null}
      </header>

      <section
        data-testid="marketplace-detail-permissions"
        className="rounded-lg border border-slate-200 bg-white p-5"
      >
        <h2 className="text-lg font-semibold text-slate-900">Permissions</h2>
        {manifest.permissions.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No additional permissions requested.</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {manifest.permissions.map((permission) => (
              <li
                key={permission}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-800"
                data-testid={`marketplace-detail-permission-${permission}`}
              >
                {permission}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        data-testid="marketplace-detail-events"
        className="rounded-lg border border-slate-200 bg-white p-5"
      >
        <h2 className="text-lg font-semibold text-slate-900">Event subscriptions</h2>
        {manifest.eventSubscriptions.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">This plugin does not consume events.</p>
        ) : (
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
            {manifest.eventSubscriptions.map((event) => (
              <li key={event} data-testid={`marketplace-detail-event-${event}`}>
                <code className="font-mono text-xs">{event}</code>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        data-testid="marketplace-detail-install"
        className="rounded-lg border border-blue-200 bg-blue-50 p-5"
      >
        <h2 className="text-lg font-semibold text-blue-900">Install in your tenant</h2>
        <p className="mt-2 text-sm text-blue-900">
          Open the admin marketplace and select <strong>{manifest.name}</strong> to install
          it for your tenant.
        </p>
        <Link
          href={`/admin/marketplace/${manifest.slug}`}
          data-testid="marketplace-detail-install-link"
          className="mt-3 inline-flex items-center rounded-md border border-blue-500 bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600"
        >
          Open in admin
        </Link>
      </section>

      {manifest.homepageUrl ? (
        <p className="text-sm text-slate-600">
          Vendor homepage:{" "}
          <a
            href={manifest.homepageUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="text-blue-700 underline hover:text-blue-900"
            data-testid="marketplace-detail-homepage"
          >
            {manifest.homepageUrl}
          </a>
        </p>
      ) : null}
    </main>
  );
}
