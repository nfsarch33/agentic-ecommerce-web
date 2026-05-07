import { AgentDashboard } from "@/components/AgentDashboard";
import { listAgents } from "@/lib/usecases/agents";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const serverBaseUrl = process.env.MC_API_BASE_URL ?? "http://localhost:8080";
  const clientBaseUrl = process.env.NEXT_PUBLIC_MC_API_BASE_URL ?? serverBaseUrl;
  const agents = await listAgents({ baseUrl: serverBaseUrl });

  return <AgentDashboard apiBaseUrl={clientBaseUrl} initialAgents={agents} />;
}
