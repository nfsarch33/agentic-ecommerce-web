import type { Metadata } from "next";
import { GettingStartedSteps } from "@/components/GettingStartedSteps";
import { publicPageMetadata } from "@/lib/seo-metadata";

export const metadata: Metadata = {
  ...publicPageMetadata({
    title: "Getting started | Agentic Ecommerce Developers",
    description:
      "10-minute path: register a tenant, scaffold a plugin module, implement the lifecycle, and ship the local sandbox smoke test.",
    canonical: "/developers/getting-started",
  }),
};

export default function DeveloperGettingStartedPage() {
  return (
    <main
      data-testid="developer-getting-started"
      className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12"
    >
      <header className="flex flex-col gap-3 border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          10-minute path
        </h1>
        <p className="text-base text-slate-700">
          Sign up, scaffold a plugin, run the local sandbox, and submit for review.
          Every step links back to the relevant SDK or API surface so you can drop the
          guide and improvise.
        </p>
      </header>
      <GettingStartedSteps />
    </main>
  );
}
