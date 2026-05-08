import type { ReactNode } from "react";
import Link from "next/link";

export interface DeveloperDocsSection {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly anchorPath?: string;
}

export interface DeveloperDocsLayoutProps {
  readonly sections: readonly DeveloperDocsSection[];
  readonly children?: ReactNode;
  readonly heroTitle?: string;
  readonly heroBody?: string;
}

const DEFAULT_HERO_TITLE = "Build for the Agentic Ecommerce marketplace";
const DEFAULT_HERO_BODY =
  "Use the Mission Control API and the plugin SDK to ship a marketplace integration. Start with the manifest contract, run the local sandbox, then submit your plugin for review.";

export function DeveloperDocsLayout({ sections, children, heroTitle, heroBody }: DeveloperDocsLayoutProps) {
  return (
    <main data-testid="developer-docs-layout" className="mx-auto flex max-w-5xl flex-col gap-8 p-6">
      <header data-testid="developer-docs-hero" className="flex flex-col gap-3 border-b pb-6">
        <h1 className="text-3xl font-semibold tracking-tight">{heroTitle ?? DEFAULT_HERO_TITLE}</h1>
        <p className="text-base text-gray-700">{heroBody ?? DEFAULT_HERO_BODY}</p>
      </header>
      <nav aria-label="Developer docs navigation" className="grid gap-3 md:grid-cols-2">
        {sections.map((section) => (
          <Link
            key={section.id}
            href={section.anchorPath ?? `#${section.id}`}
            className="rounded border p-4 hover:bg-gray-50"
            data-testid={`developer-docs-section-${section.id}`}
          >
            <h2 className="text-lg font-semibold">{section.title}</h2>
            <p className="text-sm text-gray-600">{section.summary}</p>
          </Link>
        ))}
      </nav>
      <section className="prose max-w-none">{children}</section>
    </main>
  );
}

export const DEFAULT_DEVELOPER_DOC_SECTIONS: readonly DeveloperDocsSection[] = [
  {
    id: "manifest",
    title: "Plugin manifest contract",
    summary: "Required fields, semver pinning, dependency constraints, and event subscriptions.",
  },
  {
    id: "sdk",
    title: "Plugin SDK & local sandbox",
    summary: "Run a plugin in the in-process sandbox; iterate without a tenant deployment.",
  },
  {
    id: "submission",
    title: "Submission review flow",
    summary: "Submit a manifest, track review status, and respond to admin feedback.",
    anchorPath: "/admin/marketplace/submissions",
  },
  {
    id: "events",
    title: "Event subscription reference",
    summary: "Catalogue of events plugins can subscribe to and the payload schemas.",
  },
  {
    id: "rate-limits",
    title: "Sandbox limits & quotas",
    summary: "Per-plugin call budgets, outbound rate limits, and quota escalation paths.",
  },
  {
    id: "openapi",
    title: "OpenAPI spec",
    summary: "Authoritative wire contract for /api/v1/marketplace/* endpoints.",
  },
];
