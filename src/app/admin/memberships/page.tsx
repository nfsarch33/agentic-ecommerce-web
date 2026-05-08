import type { Metadata } from "next";
import { listMembershipsUsecase } from "@/lib/usecases/list-memberships";
import { listMemberships } from "@/lib/adapters/api/memberships";
import { MembershipManagement } from "@/components/MembershipManagement";
import { requireServerSession } from "@/lib/server/auth-session";
import { adminPageMetadata } from "@/lib/seo-metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...adminPageMetadata({
    title: "Memberships | Agentic Ecommerce Admin",
    description:
      "Review subscriber memberships, watch state transitions, and pause / resume / cancel from the admin console.",
    canonical: "/admin/memberships",
  }),
};

const DEFAULT_TENANT_ID = "tenant_default";

export default async function MembershipsAdminPage() {
  const session = await requireServerSession();
  const baseUrl = process.env.MC_API_BASE_URL ?? "http://localhost:8080";
  const tenantId = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID ?? DEFAULT_TENANT_ID;

  let memberships: Awaited<ReturnType<typeof listMembershipsUsecase>> = {
    memberships: [],
    total: 0,
    page: 1,
    perPage: 20,
    counts: { trial: 0, active: 0, paused: 0, cancelled: 0, expired: 0 },
  };

  try {
    memberships = await listMembershipsUsecase(
      {},
      { baseUrl, tenantId, fetchImpl: listMemberships },
    );
  } catch {
    // Render empty state when backend is unreachable; the inner component
    // already has an "empty" branch that explains the next step.
  }

  return (
    <MembershipManagement
      initialMemberships={memberships.memberships}
      counts={memberships.counts}
      userRole={session.user.role}
      tenantId={tenantId}
      baseUrl={baseUrl}
    />
  );
}
