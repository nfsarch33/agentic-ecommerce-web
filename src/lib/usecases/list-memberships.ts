// Use case: list memberships for the admin page (paginated, optionally
// filtered by state). Keeps the React component free of HTTP concerns
// and adapter parsing.

import { listMemberships, type ListMembershipsOptions, type MembershipsList } from "@/lib/adapters/api/memberships";
import type { MembershipState, Subscription } from "@/lib/domain/membership";
import { isMembershipState } from "@/lib/domain/membership";

export interface ListMembershipsInput {
  readonly state?: MembershipState;
  readonly page?: number;
  readonly perPage?: number;
}

export interface ListMembershipsResult {
  readonly memberships: readonly Subscription[];
  readonly total: number;
  readonly page: number;
  readonly perPage: number;
  readonly counts: Readonly<Record<MembershipState, number>>;
}

export interface ListMembershipsDeps {
  readonly baseUrl: string;
  readonly tenantId: string;
  readonly fetchImpl: typeof listMemberships | ((opts: ListMembershipsOptions) => Promise<MembershipsList>);
}

const ZERO_COUNTS: Record<MembershipState, number> = {
  trial: 0,
  active: 0,
  paused: 0,
  cancelled: 0,
  expired: 0,
};

export async function listMembershipsUsecase(
  input: ListMembershipsInput,
  deps: ListMembershipsDeps,
): Promise<ListMembershipsResult> {
  const list = await deps.fetchImpl({
    baseUrl: deps.baseUrl,
    tenantId: deps.tenantId,
    page: input.page,
    perPage: input.perPage,
  });

  const filtered = input.state && isMembershipState(input.state)
    ? list.memberships.filter((m) => m.state === input.state)
    : list.memberships;

  const counts: Record<MembershipState, number> = { ...ZERO_COUNTS };
  for (const m of list.memberships) {
    counts[m.state] += 1;
  }

  return {
    memberships: filtered,
    total: list.total,
    page: list.page,
    perPage: list.perPage,
    counts,
  };
}
