import type { Metadata } from "next";
import { listMembershipPlans } from "@/lib/adapters/api/membership-plans";
import { listMemberships } from "@/lib/adapters/api/memberships";
import { CustomerMembershipPanel } from "@/components/CustomerMembershipPanel";
import { adminPageMetadata } from "@/lib/seo-metadata";
import { getServerSession } from "@/lib/server/auth-session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...adminPageMetadata({
    title: "My membership | Agentic Ecommerce",
    description: "Join, pause, resume, or cancel your membership.",
    canonical: "/account/membership",
  }),
};

const DEFAULT_TENANT_ID = "tenant_default";

export default async function CustomerMembershipPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/login?next=/account/membership");
  }
  const baseUrl = process.env.MC_API_BASE_URL ?? "http://localhost:8080";
  const tenantId = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID ?? DEFAULT_TENANT_ID;

  const plansResult = await listMembershipPlans({ baseUrl, tenantId }).catch(() => ({
    plans: [],
    total: 0,
    page: 1,
    perPage: 0,
  }));

  // Best-effort: find the current user's membership by listing and
  // matching email. The viewer-RBAC layer on the backend ensures we
  // only see memberships the user is permitted to read.
  const list = await listMemberships({ baseUrl, tenantId }).catch(() => ({
    memberships: [],
    total: 0,
    page: 1,
    perPage: 0,
  }));
  const ownEmail = session.user.email.toLowerCase();
  // Prefer the active/paused/trial subscription so customers always see
  // their current state, not a stale cancelled/expired record.
  const ownMatches = list.memberships.filter(
    (m) => m.memberEmail.toLowerCase() === ownEmail,
  );
  const own =
    ownMatches.find((m) => m.state === "active" || m.state === "paused" || m.state === "trial") ??
    ownMatches[0];

  return (
    <CustomerMembershipPanel
      plans={plansResult.plans}
      membership={own}
      tenantId={tenantId}
      baseUrl={baseUrl}
    />
  );
}
