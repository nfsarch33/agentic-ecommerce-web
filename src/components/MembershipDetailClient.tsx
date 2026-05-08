"use client";
import { useState } from "react";
import type { Subscription } from "@/lib/domain/membership";
import type { Role } from "@/lib/domain/auth";
import { canAccessRole } from "@/lib/domain/auth";
import { MembershipStatusPill } from "./MembershipStatusPill";
import { MembershipActions, type MembershipAction } from "./MembershipActions";
import {
  cancelMembershipUsecase,
  IllegalMembershipTransitionError,
} from "@/lib/usecases/cancel-membership";
import { pauseMembershipUsecase } from "@/lib/usecases/pause-membership";
import { resumeMembershipUsecase } from "@/lib/usecases/resume-membership";

export interface MembershipActionsClientProps {
  readonly initialMembership: Subscription;
  readonly tenantId: string;
  readonly baseUrl: string;
  readonly userRole: Role;
}

export function MembershipActionsClient({
  initialMembership,
  tenantId,
  baseUrl,
  userRole,
}: MembershipActionsClientProps) {
  const canMutate = canAccessRole(userRole, "operator");
  const [membership, setMembership] = useState<Subscription>(initialMembership);
  const [busy, setBusy] = useState<MembershipAction | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  if (!canMutate) {
    return (
      <p className="rounded-md bg-gray-50 p-3 text-sm text-gray-600">
        Operator access is required to run lifecycle actions.
      </p>
    );
  }

  const dispatchAction = async (action: MembershipAction) => {
    setBusy(action);
    setError(undefined);
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
      setMembership(updated);
    } catch (err) {
      setError(
        err instanceof IllegalMembershipTransitionError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Action failed",
      );
    } finally {
      setBusy(undefined);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700">Current state:</span>
        <MembershipStatusPill state={membership.state} />
      </div>
      <MembershipActions
        membership={membership}
        onAction={(a) => void dispatchAction(a)}
        busyAction={busy}
      />
      {error && (
        <p
          role="alert"
          data-testid="membership-detail-error"
          className="text-sm text-rose-700"
        >
          {error}
        </p>
      )}
    </div>
  );
}
