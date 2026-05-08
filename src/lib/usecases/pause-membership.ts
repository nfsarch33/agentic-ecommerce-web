import {
  pauseMembership,
  type MembershipTransitionOptions,
} from "@/lib/adapters/api/memberships";
import type { Subscription } from "@/lib/domain/membership";
import { canTransition } from "@/lib/domain/membership";
import { IllegalMembershipTransitionError } from "./cancel-membership";

export interface PauseMembershipInput {
  readonly membership: Subscription;
}

export interface PauseMembershipDeps {
  readonly baseUrl: string;
  readonly tenantId: string;
  readonly pauseImpl?: typeof pauseMembership | ((opts: MembershipTransitionOptions) => Promise<Subscription>);
}

export async function pauseMembershipUsecase(
  input: PauseMembershipInput,
  deps: PauseMembershipDeps,
): Promise<Subscription> {
  if (!canTransition(input.membership.state, "pause")) {
    throw new IllegalMembershipTransitionError(
      `cannot pause membership in state '${input.membership.state}'`,
    );
  }
  const impl = deps.pauseImpl ?? pauseMembership;
  return impl({
    baseUrl: deps.baseUrl,
    tenantId: deps.tenantId,
    membershipId: input.membership.id,
  });
}
