"use client";
import { useCallback, useState } from "react";
import Link from "next/link";
import type { Subscription } from "@/lib/domain/membership";
import { canAccessRole, type Role } from "@/lib/domain/auth";
import { formatMoney } from "@/lib/domain/product";
import { MembershipStatusPill } from "./MembershipStatusPill";
import { MembershipActions, type MembershipAction } from "./MembershipActions";
import {
  cancelMembershipUsecase,
  IllegalMembershipTransitionError,
} from "@/lib/usecases/cancel-membership";
import { pauseMembershipUsecase } from "@/lib/usecases/pause-membership";
import { resumeMembershipUsecase } from "@/lib/usecases/resume-membership";

export interface MembershipManagementProps {
  readonly initialMemberships: readonly Subscription[];
  readonly counts: Readonly<Record<string, number>>;
  readonly userRole: Role;
  readonly tenantId: string;
  readonly baseUrl: string;
}

export function MembershipManagement({
  initialMemberships,
  counts,
  userRole,
  tenantId,
  baseUrl,
}: MembershipManagementProps) {
  const canMutate = canAccessRole(userRole, "operator");
  const [memberships, setMemberships] = useState<readonly Subscription[]>(initialMemberships);
  const [busy, setBusy] = useState<Record<string, MembershipAction | undefined>>({});
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const dispatchAction = useCallback(
    async (membership: Subscription, action: MembershipAction) => {
      setBusy((prev) => ({ ...prev, [membership.id]: action }));
      setErrors((prev) => ({ ...prev, [membership.id]: undefined }));
      const deps = { baseUrl, tenantId };
      try {
        let updated: Subscription;
        switch (action) {
          case "pause":
            updated = await pauseMembershipUsecase({ membership }, deps);
            break;
          case "resume":
            updated = await resumeMembershipUsecase({ membership }, deps);
            break;
          case "cancel":
            updated = await cancelMembershipUsecase({ membership }, deps);
            break;
        }
        setMemberships((prev) => prev.map((m) => (m.id === membership.id ? updated : m)));
      } catch (err) {
        const message =
          err instanceof IllegalMembershipTransitionError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Action failed";
        setErrors((prev) => ({ ...prev, [membership.id]: message }));
      } finally {
        setBusy((prev) => ({ ...prev, [membership.id]: undefined }));
      }
    },
    [baseUrl, tenantId],
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-gray-500">Admin</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Memberships</h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-600">
            Review and manage subscriber memberships. State transitions follow the backend state
            machine: trial → active, active ↔ paused, plus cancel/expire as terminal moves.
          </p>
        </div>
        {!canMutate && (
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
            View-only access
          </span>
        )}
      </header>

      <section
        aria-label="Membership state counts"
        className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5"
      >
        {(["trial", "active", "paused", "cancelled", "expired"] as const).map((s) => (
          <div
            key={s}
            data-testid={`membership-count-${s}`}
            className="rounded-md border border-gray-200 bg-white p-3"
          >
            <p className="text-xs uppercase tracking-wide text-gray-500">{s}</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">{counts[s] ?? 0}</p>
          </div>
        ))}
      </section>

      {memberships.length === 0 ? (
        <p
          data-testid="memberships-empty"
          className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-600"
        >
          No memberships yet. Customers can join from /account/membership.
        </p>
      ) : (
        <ul className="grid gap-3" data-testid="memberships-list">
          {memberships.map((m) => (
            <li
              key={m.id}
              data-testid={`membership-row-${m.id}`}
              className="rounded-lg border border-gray-200 bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/admin/memberships/${m.id}`}
                    className="text-base font-semibold text-emerald-700 hover:underline"
                  >
                    {m.memberEmail}
                  </Link>
                  <p className="mt-1 text-sm text-gray-600">
                    Plan: <span className="font-medium">{m.plan.name}</span> ·{" "}
                    {formatMoney(m.plan.price)} / {m.plan.billingCycle === "monthly" ? "mo" : "yr"}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Period {new Date(m.currentPeriodStart).toLocaleDateString("en-AU")} →{" "}
                    {new Date(m.currentPeriodEnd).toLocaleDateString("en-AU")}
                  </p>
                </div>
                <MembershipStatusPill state={m.state} />
              </div>
              {canMutate && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <MembershipActions
                    membership={m}
                    onAction={(a) => void dispatchAction(m, a)}
                    busyAction={busy[m.id]}
                  />
                  {errors[m.id] && (
                    <p
                      role="alert"
                      data-testid={`membership-error-${m.id}`}
                      className="text-sm text-rose-700"
                    >
                      {errors[m.id]}
                    </p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
