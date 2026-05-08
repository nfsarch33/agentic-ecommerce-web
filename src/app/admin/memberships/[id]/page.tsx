import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchMembership, MembershipsApiError } from "@/lib/adapters/api/memberships";
import { MembershipActionsClient } from "@/components/MembershipDetailClient";
import { requireServerSession } from "@/lib/server/auth-session";
import { formatMoney } from "@/lib/domain/product";
import { MembershipStatusPill } from "@/components/MembershipStatusPill";
import { adminPageMetadata } from "@/lib/seo-metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...adminPageMetadata({
    title: "Membership detail | Agentic Ecommerce Admin",
    description: "Inspect a single membership and run state transitions.",
    canonical: "/admin/memberships/[id]",
  }),
};

const DEFAULT_TENANT_ID = "tenant_default";

interface MembershipDetailParams {
  readonly params: Promise<{ readonly id: string }>;
}

export default async function MembershipDetailPage({ params }: MembershipDetailParams) {
  const session = await requireServerSession();
  const { id } = await params;
  const baseUrl = process.env.MC_API_BASE_URL ?? "http://localhost:8080";
  const tenantId = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID ?? DEFAULT_TENANT_ID;

  let membership;
  try {
    membership = await fetchMembership({ baseUrl, tenantId, membershipId: id });
  } catch (err) {
    if (err instanceof MembershipsApiError && err.message.includes("HTTP 404")) {
      notFound();
    }
    throw err;
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href="/admin/memberships"
        className="text-sm text-emerald-700 hover:underline"
      >
        ← All memberships
      </Link>
      <header className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-gray-500">Member</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{membership.memberEmail}</h1>
          <p className="mt-1 text-sm text-gray-600">
            Plan {membership.plan.name} · {formatMoney(membership.plan.price)} /{" "}
            {membership.plan.billingCycle === "monthly" ? "mo" : "yr"}
          </p>
        </div>
        <MembershipStatusPill state={membership.state} />
      </header>
      <dl className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-md bg-gray-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-gray-500">Period start</dt>
          <dd className="mt-1 text-sm font-medium">
            {new Date(membership.currentPeriodStart).toLocaleDateString("en-AU")}
          </dd>
        </div>
        <div className="rounded-md bg-gray-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-gray-500">Period end</dt>
          <dd className="mt-1 text-sm font-medium">
            {new Date(membership.currentPeriodEnd).toLocaleDateString("en-AU")}
          </dd>
        </div>
        <div className="rounded-md bg-gray-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-gray-500">Trial ends</dt>
          <dd className="mt-1 text-sm font-medium">
            {new Date(membership.trialEndsAt).toLocaleDateString("en-AU")}
          </dd>
        </div>
      </dl>
      <section className="mt-8">
        <h2 className="text-lg font-semibold">Lifecycle actions</h2>
        <p className="mt-1 text-sm text-gray-600">
          Allowed actions follow the backend state machine. Illegal transitions are rejected with a
          typed error.
        </p>
        <div className="mt-4">
          <MembershipActionsClient
            initialMembership={membership}
            tenantId={tenantId}
            baseUrl={baseUrl}
            userRole={session.user.role}
          />
        </div>
      </section>
    </main>
  );
}
