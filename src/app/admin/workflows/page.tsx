import type { Metadata } from "next";
import { WorkflowStatusList } from "@/components/WorkflowStatusList";
import { loadWorkflowList } from "@/lib/usecases/workflows";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Workflow Status | Agentic Ecommerce Admin",
  description: "Monitor product publish workflows across running, completed, and failed states.",
  alternates: {
    canonical: "/admin/workflows",
  },
};

export default async function WorkflowsPage() {
  const baseUrl = process.env.MC_API_BASE_URL ?? "http://localhost:8080";
  const result = await loadWorkflowList({ baseUrl, limit: 50 });

  return <WorkflowStatusList workflows={result.workflows} counts={result.counts} />;
}
