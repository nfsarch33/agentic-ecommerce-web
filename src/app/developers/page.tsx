import type { Metadata } from "next";
import Link from "next/link";
import { publicPageMetadata } from "@/lib/seo-metadata";

export const metadata: Metadata = {
  ...publicPageMetadata({
    title: "Developers | Agentic Ecommerce",
    description:
      "Build with the Agentic Ecommerce platform. Plugin SDK, OpenAPI reference, marketplace storefront, and a 10-minute getting-started guide.",
    canonical: "/developers",
  }),
};

interface PortalCard {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly href: string;
  readonly cta: string;
  readonly external?: boolean;
}

const portalCards: readonly PortalCard[] = [
  {
    id: "getting-started",
    title: "Getting started",
    summary:
      "10-minute path: sign up tenant -> install a plugin -> write Hello World plugin -> run the local sandbox.",
    href: "/developers/getting-started",
    cta: "Open the quickstart",
  },
  {
    id: "sdk",
    title: "Plugin SDK",
    summary:
      "Public Go module pkg/marketplace/sdk. Type-aliased lifecycle interfaces, deterministic test sandbox, example plugin.",
    href: "/developers/sdk",
    cta: "Read SDK docs",
  },
  {
    id: "api",
    title: "API reference",
    summary:
      "OpenAPI 3.1 spec for the Mission Control API. v1 endpoints stable through v3.x; v2 preview opt-in.",
    href: "/developers/api",
    cta: "Browse the API",
  },
  {
    id: "marketplace",
    title: "Marketplace storefront",
    summary:
      "Public catalogue of installable plugins. Browse, search, and link from your storefront.",
    href: "/marketplace",
    cta: "Open the marketplace",
  },
  {
    id: "submission-flow",
    title: "Submission review flow",
    summary:
      "Submit your plugin manifest; track review status; respond to admin feedback before promotion.",
    href: "/docs/developers",
    cta: "Read developer docs",
  },
  {
    id: "openapi-yaml",
    title: "OpenAPI raw spec",
    summary:
      "Authoritative wire contract. Download api/openapi.yaml from the source repo to run code generation against it.",
    href: "https://github.com/nfsarch33/agentic-ecommerce/blob/main/api/openapi.yaml",
    cta: "View on GitHub",
    external: true,
  },
];

export default function DevelopersPortalPage() {
  return (
    <main
      data-testid="developers-portal"
      className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12"
    >
      <header className="flex flex-col gap-3 border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Developers</h1>
        <p className="text-base text-slate-700">
          Build a marketplace plugin or integrate the Mission Control API. The Plugin SDK
          re-exports a stable lifecycle surface from the host so your plugin code never
          imports internal packages.
        </p>
      </header>
      <section
        aria-label="Developer portal cards"
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        {portalCards.map((card) => {
          const linkProps = card.external
            ? {
                href: card.href,
                target: "_blank" as const,
                rel: "noreferrer noopener" as const,
              }
            : { href: card.href };
          return (
            <article
              key={card.id}
              data-testid={`developer-card-${card.id}`}
              className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <h2 className="text-lg font-semibold text-slate-900">{card.title}</h2>
              <p className="text-sm text-slate-600">{card.summary}</p>
              <Link
                {...linkProps}
                className="mt-auto inline-flex w-fit items-center rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-100"
                data-testid={`developer-card-link-${card.id}`}
              >
                {card.cta}
              </Link>
            </article>
          );
        })}
      </section>
      <section
        aria-label="Stability policy summary"
        className="rounded-lg border border-slate-200 bg-slate-50 p-5"
        data-testid="developer-policy-summary"
      >
        <h2 className="text-lg font-semibold text-slate-900">Stability policy</h2>
        <p className="mt-2 text-sm text-slate-700">
          v1 endpoints are stable through host v3.x. v2 preview endpoints are opt-in
          (path or <code className="font-mono">application/vnd.ec.v2+json</code> Accept
          header) and may change without notice. Every response carries
          <code className="ml-1 font-mono">X-API-Version</code>; preview surfaces add
          <code className="ml-1 font-mono">X-API-Deprecation</code>.
        </p>
      </section>
    </main>
  );
}
