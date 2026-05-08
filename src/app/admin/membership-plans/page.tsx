import type { Metadata } from "next";
import {
  listMembershipPlans,
  MembershipPlansApiError,
  type MembershipPlansList,
} from "@/lib/adapters/api/membership-plans";
import { MembershipPlanManagement } from "@/components/MembershipPlanManagement";
import { requireServerSession } from "@/lib/server/auth-session";
import { adminPageMetadata } from "@/lib/seo-metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...adminPageMetadata({
    title: "Membership plans | Agentic Ecommerce Admin",
    description:
      "Review the membership plans the storefront offers. Plans drive pricing, billing cycle, and benefits.",
    canonical: "/admin/membership-plans",
  }),
};

const DEFAULT_TENANT_ID = "tenant_default";

export default async function MembershipPlansAdminPage() {
  const session = await requireServerSession();
  const baseUrl = process.env.MC_API_BASE_URL ?? "http://localhost:8080";
  const tenantId = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID ?? DEFAULT_TENANT_ID;

  let result: MembershipPlansList = { plans: [], total: 0, page: 1, perPage: 20 };
  try {
    result = await listMembershipPlans({ baseUrl, tenantId });
  } catch (err) {
    if (!(err instanceof MembershipPlansApiError)) {
      throw err;
    }
    // Fall through to empty-state render.
  }

  return (
    <MembershipPlanManagement initialPlans={result.plans} userRole={session.user.role} />
  );
}
