import type { Metadata } from "next";
import { AgentActivityFeed } from "@/components/AgentActivityFeed";
import { adminPageMetadata } from "@/lib/seo-metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...adminPageMetadata({
    title: "Agent Activity | Agentic Ecommerce Admin",
    description:
      "Live agent activity feed: pricing decisions, dropship orders, customer messages, and supplier cost changes.",
    canonical: "/agent-activity",
  }),
};

export default function AgentActivityPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-950">Agent activity</h1>
        <p className="mt-1 text-sm text-gray-600">
          Server-sent events from the Mission Control backend. Connections heartbeat every 30 seconds; the
          feed automatically reconnects on transient network failures.
        </p>
      </header>
      <AgentActivityFeed />
    </main>
  );
}
