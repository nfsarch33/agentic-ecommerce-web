import type { Metadata } from "next";
import Link from "next/link";
import { ApiVersionToggle } from "@/components/ApiVersionToggle";
import { publicPageMetadata } from "@/lib/seo-metadata";

export const metadata: Metadata = {
  ...publicPageMetadata({
    title: "API reference | Agentic Ecommerce Developers",
    description:
      "OpenAPI 3.1 reference for the Agentic Ecommerce Mission Control API. v1 stable, v2 preview opt-in.",
    canonical: "/developers/api",
  }),
};

const SPEC_REPO_BASE =
  "https://raw.githubusercontent.com/nfsarch33/agentic-ecommerce/main/api";

const v1Endpoints = [
  { path: "/api/v1/products", verbs: "GET, POST" },
  { path: "/api/v1/products/{id}", verbs: "GET, PUT, DELETE" },
  { path: "/api/v1/orders", verbs: "GET, POST" },
  { path: "/api/v1/marketplace/plugins", verbs: "GET" },
  { path: "/api/v1/marketplace/tenants/{tenant}/plugins/{slug}/install", verbs: "POST" },
  { path: "/api/v1/marketplace/plugins/submit", verbs: "POST" },
  { path: "/api/v1/memberships", verbs: "GET, POST" },
  { path: "/api/v1/digital-products", verbs: "GET, POST" },
  { path: "/api/v1/licenses", verbs: "GET" },
  { path: "/api/v1/webhooks", verbs: "GET, POST" },
];

const v2PreviewEndpoints = [
  {
    path: "/api/v2/marketplace/plugins/{slug}/install",
    verbs: "POST",
    note: "Evolved response shape with sandbox snapshot, settings schema, dependency tree.",
  },
];

export default function DeveloperApiPage() {
  return (
    <main
      data-testid="developer-api-reference"
      className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12"
    >
      <header className="flex flex-col gap-3 border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">API reference</h1>
        <p className="text-base text-slate-700">
          The canonical Mission Control API spec. Two surfaces ship: stable v1 and
          opt-in v2 preview. Use the toggle below to read the spec for either version.
        </p>
        <ApiVersionToggle
          v1SpecUrl={`${SPEC_REPO_BASE}/openapi.yaml`}
          v2SpecUrl={`${SPEC_REPO_BASE}/openapi-v2-preview.yaml`}
        />
      </header>

      <section
        data-testid="developer-api-v1"
        className="rounded-lg border border-slate-200 bg-white p-5"
      >
        <h2 className="text-xl font-semibold text-slate-900">v1 endpoints (stable)</h2>
        <p className="mt-2 text-sm text-slate-600">
          v1 endpoints are stable through host v3.x. New optional fields may be added;
          breaking changes require a major release.
        </p>
        <table className="mt-4 w-full text-sm" aria-label="v1 endpoints">
          <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="py-2">Path</th>
              <th scope="col" className="py-2">Verbs</th>
            </tr>
          </thead>
          <tbody>
            {v1Endpoints.map((endpoint) => (
              <tr
                key={endpoint.path}
                data-testid={`v1-endpoint-${endpoint.path}`}
                className="border-t border-slate-100"
              >
                <td className="py-1.5 font-mono text-xs text-slate-800">{endpoint.path}</td>
                <td className="py-1.5 text-slate-700">{endpoint.verbs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section
        data-testid="developer-api-v2"
        className="rounded-lg border border-amber-200 bg-amber-50 p-5"
      >
        <header className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-amber-900">v2 preview endpoints</h2>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
            preview
          </span>
        </header>
        <p className="mt-2 text-sm text-amber-900">
          Preview semantics: clients must opt in via the path or the
          <code className="mx-1 font-mono">application/vnd.ec.v2+json</code> Accept
          header. Schemas may change without notice. Every v2 response carries
          <code className="ml-1 font-mono">X-API-Deprecation: preview; semantics may change without notice</code>.
        </p>
        <ul className="mt-4 space-y-2">
          {v2PreviewEndpoints.map((endpoint) => (
            <li
              key={endpoint.path}
              data-testid={`v2-endpoint-${endpoint.path}`}
              className="rounded-md border border-amber-200 bg-white p-3"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-xs text-slate-800">{endpoint.path}</span>
                <span className="text-xs text-slate-700">{endpoint.verbs}</span>
              </div>
              <p className="mt-1 text-sm text-slate-700">{endpoint.note}</p>
            </li>
          ))}
        </ul>
      </section>

      <section
        data-testid="developer-api-spec-links"
        className="rounded-lg border border-slate-200 bg-white p-5"
      >
        <h2 className="text-lg font-semibold text-slate-900">Download the spec</h2>
        <p className="mt-2 text-sm text-slate-700">
          The OpenAPI 3.1 specs live in the source repo. Pull them into your toolchain
          to generate typed clients.
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          <li>
            <Link
              href={`${SPEC_REPO_BASE}/openapi.yaml`}
              target="_blank"
              rel="noreferrer noopener"
              className="text-blue-700 underline hover:text-blue-900"
              data-testid="spec-link-v1"
            >
              api/openapi.yaml (v1, stable)
            </Link>
          </li>
          <li>
            <Link
              href={`${SPEC_REPO_BASE}/openapi-v2-preview.yaml`}
              target="_blank"
              rel="noreferrer noopener"
              className="text-blue-700 underline hover:text-blue-900"
              data-testid="spec-link-v2"
            >
              api/openapi-v2-preview.yaml (v2, preview)
            </Link>
          </li>
        </ul>
      </section>
    </main>
  );
}
