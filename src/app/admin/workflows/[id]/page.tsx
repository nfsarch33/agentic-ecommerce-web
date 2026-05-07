import type { Metadata } from "next";
import { WorkflowTimeline } from "@/components/WorkflowTimeline";
import { loadWorkflowDetail } from "@/lib/usecases/workflows";
import { adminPageMetadata } from "@/lib/seo-metadata";

export const dynamic = "force-dynamic";

interface WorkflowDetailPageProps {
  readonly params: Promise<{ readonly id: string }>;
}

export async function generateMetadata({ params }: WorkflowDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  return adminPageMetadata({
    title: `Workflow ${id} | Agentic Ecommerce Admin`,
    description: "Review the product publish workflow timeline and send human review signals.",
    canonical: `/admin/workflows/${id}`,
  });
}

export default async function WorkflowDetailPage({ params }: WorkflowDetailPageProps) {
  const { id } = await params;
  const serverBaseUrl = process.env.MC_API_BASE_URL ?? "http://localhost:8080";
  const clientBaseUrl = process.env.NEXT_PUBLIC_MC_API_BASE_URL ?? serverBaseUrl;
  const workflow = await loadWorkflowDetail({ baseUrl: serverBaseUrl, workflowId: id });

  return <WorkflowTimeline workflow={workflow} apiBaseUrl={clientBaseUrl} />;
}
