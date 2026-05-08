import {
  cancelMembership,
  type MembershipTransitionOptions,
} from "@/lib/adapters/api/memberships";
import type { Subscription } from "@/lib/domain/membership";
import { canTransition } from "@/lib/domain/membership";

export interface CancelMembershipInput {
  readonly membership: Subscription;
}

export interface CancelMembershipDeps {
  readonly baseUrl: string;
  readonly tenantId: string;
  readonly cancelImpl?: typeof cancelMembership | ((opts: MembershipTransitionOptions) => Promise<Subscription>);
}

export class IllegalMembershipTransitionError extends Error {
  override readonly name = "IllegalMembershipTransitionError";
}

export async function cancelMembershipUsecase(
  input: CancelMembershipInput,
  deps: CancelMembershipDeps,
): Promise<Subscription> {
  if (!canTransition(input.membership.state, "cancel")) {
    throw new IllegalMembershipTransitionError(
      `cannot cancel membership in state '${input.membership.state}'`,
    );
  }
  const impl = deps.cancelImpl ?? cancelMembership;
  return impl({
    baseUrl: deps.baseUrl,
    tenantId: deps.tenantId,
    membershipId: input.membership.id,
  });
}
