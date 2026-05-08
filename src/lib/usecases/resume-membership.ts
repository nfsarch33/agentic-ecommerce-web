import {
  resumeMembership,
  type MembershipTransitionOptions,
} from "@/lib/adapters/api/memberships";
import type { Subscription } from "@/lib/domain/membership";
import { canTransition } from "@/lib/domain/membership";
import { IllegalMembershipTransitionError } from "./cancel-membership";

export interface ResumeMembershipInput {
  readonly membership: Subscription;
}

export interface ResumeMembershipDeps {
  readonly baseUrl: string;
  readonly tenantId: string;
  readonly resumeImpl?: typeof resumeMembership | ((opts: MembershipTransitionOptions) => Promise<Subscription>);
}

export async function resumeMembershipUsecase(
  input: ResumeMembershipInput,
  deps: ResumeMembershipDeps,
): Promise<Subscription> {
  if (!canTransition(input.membership.state, "resume")) {
    throw new IllegalMembershipTransitionError(
      `cannot resume membership in state '${input.membership.state}'`,
    );
  }
  const impl = deps.resumeImpl ?? resumeMembership;
  return impl({
    baseUrl: deps.baseUrl,
    tenantId: deps.tenantId,
    membershipId: input.membership.id,
  });
}
