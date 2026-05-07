import type { Metadata } from "next";
import { AgentDashboard } from "@/components/AgentDashboard";
import { listAgents } from "@/lib/usecases/agents";
import {
  listAgentSchedules,
  listPricingRecommendations,
  listPricingStrategies,
  listSourcingRecommendations,
} from "@/lib/usecases/agent-automation";
import { adminPageMetadata } from "@/lib/seo-metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...adminPageMetadata({
    title: "Agent Dashboard | Agentic Ecommerce Admin",
    description: "Monitor sourcing, pricing, and automation agents with recommendations and schedules.",
    canonical: "/admin/agents",
  }),
};

export default async function AgentsPage() {
  const serverBaseUrl = process.env.MC_API_BASE_URL ?? "http://localhost:8080";
  const clientBaseUrl = process.env.NEXT_PUBLIC_MC_API_BASE_URL ?? serverBaseUrl;
  const [agents, sourcingRecommendations, pricingStrategies, pricingRecommendations, schedules] = await Promise.all([
    listAgents({ baseUrl: serverBaseUrl }),
    listSourcingRecommendations({ baseUrl: serverBaseUrl }),
    listPricingStrategies({ baseUrl: serverBaseUrl }),
    listPricingRecommendations({ baseUrl: serverBaseUrl }),
    listAgentSchedules({ baseUrl: serverBaseUrl }),
  ]);

  return (
    <AgentDashboard
      apiBaseUrl={clientBaseUrl}
      initialAgents={agents}
      initialSourcingRecommendations={sourcingRecommendations}
      initialPricingStrategies={pricingStrategies}
      initialPricingRecommendations={pricingRecommendations}
      initialSchedules={schedules}
    />
  );
}
