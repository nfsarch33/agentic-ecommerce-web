// HTTP adapter for the /api/v1/memberships backend endpoints.

import type { MembershipState, Subscription } from "@/lib/domain/membership";
import { isMembershipState } from "@/lib/domain/membership";
import { parsePlan } from "./membership-plans";

export interface ListMembershipsOptions {
  readonly baseUrl: string;
  readonly tenantId: string;
  readonly page?: number;
  readonly perPage?: number;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface FetchMembershipOptions {
  readonly baseUrl: string;
  readonly tenantId: string;
  readonly membershipId: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface CreateMembershipOptions {
  readonly baseUrl: string;
  readonly tenantId: string;
  readonly memberEmail: string;
  readonly planId: string;
  readonly trialDays?: number;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface MembershipTransitionOptions {
  readonly baseUrl: string;
  readonly tenantId: string;
  readonly membershipId: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface MembershipsList {
  readonly memberships: readonly Subscription[];
  readonly total: number;
  readonly page: number;
  readonly perPage: number;
}

export class MembershipsApiError extends Error {
  override readonly name = "MembershipsApiError";
  override readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.cause = cause;
  }
}

interface RawSubscription {
  readonly id?: unknown;
  readonly tenant_id?: unknown;
  readonly member_id?: unknown;
  readonly member_email?: unknown;
  readonly plan_id?: unknown;
  readonly state?: unknown;
  readonly current_period_start?: unknown;
  readonly current_period_end?: unknown;
  readonly trial_ends_at?: unknown;
  readonly stripe_subscription_id?: unknown;
  readonly cancelled_at?: unknown;
  readonly created_at?: unknown;
  readonly updated_at?: unknown;
  readonly plan?: unknown;
}

interface RawList {
  readonly memberships?: unknown;
  readonly total?: unknown;
  readonly page?: unknown;
  readonly per_page?: unknown;
}

function parseString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new MembershipsApiError(`${label} must be a non-empty string`);
  }
  return value;
}

function parseState(raw: unknown): MembershipState {
  if (!isMembershipState(raw)) {
    throw new MembershipsApiError(`subscription.state is invalid: ${JSON.stringify(raw)}`);
  }
  return raw;
}

function parseOptionalString(raw: unknown): string | undefined {
  return typeof raw === "string" && raw.trim() !== "" ? raw : undefined;
}

function parseSubscription(raw: unknown): Subscription {
  const value = raw as RawSubscription;
  if (!value?.plan) {
    throw new MembershipsApiError("subscription.plan is required");
  }
  return {
    id: parseString(value?.id, "subscription.id"),
    tenantId: parseString(value?.tenant_id, "subscription.tenant_id"),
    memberId: parseString(value?.member_id, "subscription.member_id"),
    memberEmail: parseString(value?.member_email, "subscription.member_email"),
    planId: parseString(value?.plan_id, "subscription.plan_id"),
    state: parseState(value?.state),
    currentPeriodStart: parseString(value?.current_period_start, "subscription.current_period_start"),
    currentPeriodEnd: parseString(value?.current_period_end, "subscription.current_period_end"),
    trialEndsAt: parseString(value?.trial_ends_at, "subscription.trial_ends_at"),
    stripeSubscriptionId: parseOptionalString(value?.stripe_subscription_id),
    cancelledAt: parseOptionalString(value?.cancelled_at),
    createdAt: parseString(value?.created_at, "subscription.created_at"),
    updatedAt: parseString(value?.updated_at, "subscription.updated_at"),
    plan: parsePlan(value.plan),
  };
}

function parseList(raw: unknown): MembershipsList {
  const value = raw as RawList;
  if (!Array.isArray(value?.memberships)) {
    throw new MembershipsApiError("response.memberships must be an array");
  }
  return {
    memberships: value.memberships.map(parseSubscription),
    total: typeof value?.total === "number" ? value.total : 0,
    page: typeof value?.page === "number" ? value.page : 1,
    perPage: typeof value?.per_page === "number" ? value.per_page : value.memberships.length,
  };
}

function tenantHeaders(tenantId: string): HeadersInit {
  return { "x-tenant-id": tenantId };
}

async function readSubscription(res: Response, label: string): Promise<Subscription> {
  if (!res.ok) {
    throw new MembershipsApiError(`${label}: HTTP ${res.status}`);
  }
  try {
    return parseSubscription(await res.json());
  } catch (err) {
    if (err instanceof MembershipsApiError) throw err;
    throw new MembershipsApiError(`${label}: invalid JSON`, err);
  }
}

export async function listMemberships(opts: ListMembershipsOptions): Promise<MembershipsList> {
  if (!opts.baseUrl) throw new MembershipsApiError("listMemberships: baseUrl is required");
  if (!opts.tenantId) throw new MembershipsApiError("listMemberships: tenantId is required");
  const fetchImpl = opts.fetchImpl ?? fetch;
  const params = new URLSearchParams();
  if (opts.page) params.set("page", String(opts.page));
  if (opts.perPage) params.set("per_page", String(opts.perPage));
  const query = params.toString();
  const url = `${opts.baseUrl}/api/v1/memberships${query ? `?${query}` : ""}`;
  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: "GET",
      headers: { accept: "application/json", ...tenantHeaders(opts.tenantId) },
      signal: opts.signal,
    });
  } catch (err) {
    throw new MembershipsApiError("listMemberships: network error", err);
  }
  if (!res.ok) {
    throw new MembershipsApiError(`listMemberships: HTTP ${res.status}`);
  }
  try {
    return parseList(await res.json());
  } catch (err) {
    if (err instanceof MembershipsApiError) throw err;
    throw new MembershipsApiError("listMemberships: invalid JSON", err);
  }
}

export async function fetchMembership(opts: FetchMembershipOptions): Promise<Subscription> {
  if (!opts.baseUrl) throw new MembershipsApiError("fetchMembership: baseUrl is required");
  if (!opts.tenantId) throw new MembershipsApiError("fetchMembership: tenantId is required");
  if (!opts.membershipId) throw new MembershipsApiError("fetchMembership: membershipId is required");
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(
      `${opts.baseUrl}/api/v1/memberships/${encodeURIComponent(opts.membershipId)}`,
      {
        method: "GET",
        headers: { accept: "application/json", ...tenantHeaders(opts.tenantId) },
        signal: opts.signal,
      },
    );
  } catch (err) {
    throw new MembershipsApiError("fetchMembership: network error", err);
  }
  return readSubscription(res, "fetchMembership");
}

export async function createMembership(opts: CreateMembershipOptions): Promise<Subscription> {
  if (!opts.baseUrl) throw new MembershipsApiError("createMembership: baseUrl is required");
  if (!opts.tenantId) throw new MembershipsApiError("createMembership: tenantId is required");
  if (!opts.memberEmail) throw new MembershipsApiError("createMembership: memberEmail is required");
  if (!opts.planId) throw new MembershipsApiError("createMembership: planId is required");
  const fetchImpl = opts.fetchImpl ?? fetch;
  const body: Record<string, unknown> = {
    member_email: opts.memberEmail,
    plan_id: opts.planId,
  };
  if (typeof opts.trialDays === "number" && opts.trialDays > 0) {
    body["trial_days"] = opts.trialDays;
  }
  let res: Response;
  try {
    res = await fetchImpl(`${opts.baseUrl}/api/v1/memberships`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...tenantHeaders(opts.tenantId),
      },
      body: JSON.stringify(body),
      signal: opts.signal,
    });
  } catch (err) {
    throw new MembershipsApiError("createMembership: network error", err);
  }
  return readSubscription(res, "createMembership");
}

async function transition(
  opts: MembershipTransitionOptions,
  action: "cancel" | "pause" | "resume",
  label: string,
): Promise<Subscription> {
  if (!opts.baseUrl) throw new MembershipsApiError(`${label}: baseUrl is required`);
  if (!opts.tenantId) throw new MembershipsApiError(`${label}: tenantId is required`);
  if (!opts.membershipId) throw new MembershipsApiError(`${label}: membershipId is required`);
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(
      `${opts.baseUrl}/api/v1/memberships/${encodeURIComponent(opts.membershipId)}/${action}`,
      {
        method: "POST",
        headers: { accept: "application/json", ...tenantHeaders(opts.tenantId) },
        signal: opts.signal,
      },
    );
  } catch (err) {
    throw new MembershipsApiError(`${label}: network error`, err);
  }
  return readSubscription(res, label);
}

export function cancelMembership(opts: MembershipTransitionOptions): Promise<Subscription> {
  return transition(opts, "cancel", "cancelMembership");
}

export function pauseMembership(opts: MembershipTransitionOptions): Promise<Subscription> {
  return transition(opts, "pause", "pauseMembership");
}

export function resumeMembership(opts: MembershipTransitionOptions): Promise<Subscription> {
  return transition(opts, "resume", "resumeMembership");
}
