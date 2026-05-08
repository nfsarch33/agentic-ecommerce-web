import type { Metadata } from "next";
import Link from "next/link";
import { publicPageMetadata } from "@/lib/seo-metadata";

export const metadata: Metadata = {
  ...publicPageMetadata({
    title: "Plugin SDK | Agentic Ecommerce Developers",
    description:
      "pkg/marketplace/sdk -- public Go module for building Agentic Ecommerce marketplace plugins. Stable lifecycle interfaces and a deterministic test sandbox.",
    canonical: "/developers/sdk",
  }),
};

const SDK_REPO_PATH =
  "https://github.com/nfsarch33/agentic-ecommerce/tree/main/pkg/marketplace/sdk";
const SDK_README_URL =
  "https://github.com/nfsarch33/agentic-ecommerce/blob/main/pkg/marketplace/sdk/README.md";
const HELLO_EXAMPLE_URL =
  "https://github.com/nfsarch33/agentic-ecommerce/tree/main/pkg/marketplace/sdk/example/hello";

interface SdkSymbol {
  readonly name: string;
  readonly kind: "type" | "interface" | "func" | "constant" | "error";
  readonly summary: string;
}

const sdkSymbols: readonly SdkSymbol[] = [
  { name: "Plugin", kind: "interface", summary: "Lifecycle interface every plugin satisfies." },
  { name: "Manifest", kind: "type", summary: "Plugin identity, permissions, event subscriptions." },
  { name: "EventName", kind: "type", summary: "Typed alias for an event-bus identifier." },
  { name: "Permission", kind: "type", summary: "Capability flag the manifest requests." },
  { name: "Installation", kind: "type", summary: "Per-tenant per-plugin row persisted by the registry." },
  { name: "State", kind: "type", summary: "Lifecycle state: installed/active/deactivated/uninstalled." },
  { name: "EventSubscriber", kind: "interface", summary: "Optional: declare which events to receive." },
  { name: "RouteExtender", kind: "interface", summary: "Optional: expose additional HTTP routes." },
  { name: "NewTestSandbox", kind: "func", summary: "Deterministic in-memory marketplace runtime for unit tests." },
  { name: "IsValidSlug", kind: "func", summary: "kebab-case slug validator." },
  { name: "IsValidSemver", kind: "func", summary: "Strict MAJOR.MINOR.PATCH validator." },
  { name: "ErrPluginAlreadyInstalled", kind: "error", summary: "errors.Is target for duplicate installs." },
  { name: "ErrSandboxBudgetExceeded", kind: "error", summary: "errors.Is target for hook rate limit trips." },
  { name: "PermissionEmitEvents", kind: "constant", summary: "Permission constant for event emission." },
];

export default function DeveloperSdkPage() {
  return (
    <main
      data-testid="developer-sdk"
      className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12"
    >
      <header className="flex flex-col gap-3 border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Plugin SDK</h1>
        <p className="text-base text-slate-700">
          The <code>pkg/marketplace/sdk</code> Go module is the public surface
          third-party plugin authors build against. It re-exports the safe lifecycle
          types from the host so your plugin code never imports anything under
          <code className="ml-1">internal/</code>. Every symbol below follows the v1
          stability contract documented in{" "}
          <Link
            href="/developers/api"
            className="text-blue-700 underline hover:text-blue-900"
          >
            API reference
          </Link>
          .
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <Link
          href={SDK_REPO_PATH}
          target="_blank"
          rel="noreferrer noopener"
          data-testid="sdk-link-repo"
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:bg-slate-50"
        >
          <h2 className="text-lg font-semibold text-slate-900">Source on GitHub</h2>
          <p className="mt-2 text-sm text-slate-600">
            Browse the SDK package source, including testing.go and the example plugin.
          </p>
        </Link>
        <Link
          href={SDK_README_URL}
          target="_blank"
          rel="noreferrer noopener"
          data-testid="sdk-link-readme"
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:bg-slate-50"
        >
          <h2 className="text-lg font-semibold text-slate-900">README + 10-minute path</h2>
          <p className="mt-2 text-sm text-slate-600">
            Step-by-step quickstart from <code>go mod init</code> to a passing
            <code className="ml-1">SmokeCheck</code>.
          </p>
        </Link>
      </section>

      <section data-testid="sdk-symbols" className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-semibold text-slate-900">Public symbols</h2>
        <p className="mt-2 text-sm text-slate-600">
          Stable symbols re-exported from <code>internal/marketplace</code>. Use these
          in your plugin code and tests; do not import internal packages.
        </p>
        <table className="mt-4 w-full text-sm" aria-label="SDK symbols">
          <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="py-2">Symbol</th>
              <th scope="col" className="py-2">Kind</th>
              <th scope="col" className="py-2">Summary</th>
            </tr>
          </thead>
          <tbody>
            {sdkSymbols.map((sym) => (
              <tr
                key={sym.name}
                className="border-t border-slate-100"
                data-testid={`sdk-symbol-${sym.name}`}
              >
                <td className="py-1.5 font-mono text-xs text-slate-800">sdk.{sym.name}</td>
                <td className="py-1.5 text-xs uppercase tracking-wide text-slate-500">
                  {sym.kind}
                </td>
                <td className="py-1.5 text-slate-700">{sym.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section
        data-testid="sdk-example"
        className="rounded-lg border border-slate-200 bg-slate-50 p-5"
      >
        <h2 className="text-lg font-semibold text-slate-900">Example: hello plugin</h2>
        <p className="mt-2 text-sm text-slate-700">
          The repo ships <code>pkg/marketplace/sdk/example/hello/</code> as a heavily
          commented reference plugin. Run its tests:
        </p>
        <pre
          data-testid="sdk-example-snippet"
          className="mt-3 overflow-x-auto rounded-md bg-slate-900 p-4 text-xs text-slate-100"
        >
          <code>{`go test ./pkg/marketplace/sdk/example/hello/...`}</code>
        </pre>
        <Link
          href={HELLO_EXAMPLE_URL}
          target="_blank"
          rel="noreferrer noopener"
          data-testid="sdk-example-link"
          className="mt-4 inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          View example on GitHub
        </Link>
      </section>
    </main>
  );
}
