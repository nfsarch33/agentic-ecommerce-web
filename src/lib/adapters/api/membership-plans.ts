// HTTP adapter for the /api/v1/membership-plans backend endpoints.
//
// Mirrors the orders.ts adapter shape: explicit Raw* shapes, a
// dedicated *ApiError for failure modes, fetchImpl injection for unit
// tests. No React, no Zod.

import type { Money } from "@/lib/domain/product";
import type { BillingCycle, MembershipPlan } from "@/lib/domain/membership";
import { isBillingCycle } from "@/lib/domain/membership";

const currencies = new Set<Money["currency"]>(["AUD", "USD", "GBP", "EUR"]);

export interface MembershipPlanInput {
  readonly name: string;
  readonly description?: string;
  readonly billingCycle: BillingCycle;
  readonly price: Money;
  readonly benefits?: readonly string[];
  readonly stripePriceId?: string;
}

export interface ListMembershipPlansOptions {
  readonly baseUrl: string;
  readonly tenantId: string;
  readonly page?: number;
  readonly perPage?: number;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface FetchMembershipPlanOptions {
  readonly baseUrl: string;
  readonly tenantId: string;
  readonly planId: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface CreateMembershipPlanOptions {
  readonly baseUrl: string;
  readonly tenantId: string;
  readonly plan: MembershipPlanInput;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface UpdateMembershipPlanOptions extends FetchMembershipPlanOptions {
  readonly plan: Partial<MembershipPlanInput>;
}

// DeleteMembershipPlanOptions reuses the same shape as a fetch op since
// both target /membership-plans/{id} with tenant scoping.
export type DeleteMembershipPlanOptions = FetchMembershipPlanOptions;

export interface MembershipPlansList {
  readonly plans: readonly MembershipPlan[];
  readonly total: number;
  readonly page: number;
  readonly perPage: number;
}

export class MembershipPlansApiError extends Error {
  override readonly name = "MembershipPlansApiError";
  override readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.cause = cause;
  }
}

interface RawMoney {
  readonly amount?: unknown;
  readonly currency?: unknown;
}

interface RawPlan {
  readonly id?: unknown;
  readonly tenant_id?: unknown;
  readonly name?: unknown;
  readonly description?: unknown;
  readonly billing_cycle?: unknown;
  readonly price?: unknown;
  readonly benefits?: unknown;
  readonly stripe_price_id?: unknown;
  readonly created_at?: unknown;
  readonly updated_at?: unknown;
}

interface RawList {
  readonly plans?: unknown;
  readonly total?: unknown;
  readonly page?: unknown;
  readonly per_page?: unknown;
}

function parseString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new MembershipPlansApiError(`${label} must be a non-empty string`);
  }
  return value;
}

function parseMoney(raw: unknown, label: string): Money {
  const value = raw as RawMoney;
  if (
    !value ||
    typeof value.amount !== "number" ||
    !Number.isInteger(value.amount) ||
    typeof value.currency !== "string" ||
    !currencies.has(value.currency as Money["currency"])
  ) {
    throw new MembershipPlansApiError(`${label} must be { amount:number, currency }`);
  }
  return { amount: value.amount, currency: value.currency as Money["currency"] };
}

function parseBenefits(raw: unknown): readonly string[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) {
    throw new MembershipPlansApiError("plan.benefits must be an array");
  }
  return raw.map((b, idx) => parseString(b, `plan.benefits[${idx}]`));
}

function parseBillingCycle(raw: unknown): BillingCycle {
  if (!isBillingCycle(raw)) {
    throw new MembershipPlansApiError("plan.billing_cycle must be 'monthly' or 'annual'");
  }
  return raw;
}

export function parsePlan(raw: unknown): MembershipPlan {
  const value = raw as RawPlan;
  return {
    id: parseString(value?.id, "plan.id"),
    tenantId: parseString(value?.tenant_id, "plan.tenant_id"),
    name: parseString(value?.name, "plan.name"),
    description:
      typeof value?.description === "string" && value.description.trim() !== ""
        ? value.description
        : undefined,
    billingCycle: parseBillingCycle(value?.billing_cycle),
    price: parseMoney(value?.price, "plan.price"),
    benefits: parseBenefits(value?.benefits),
    stripePriceId:
      typeof value?.stripe_price_id === "string" && value.stripe_price_id !== ""
        ? value.stripe_price_id
        : undefined,
    createdAt: parseString(value?.created_at, "plan.created_at"),
    updatedAt: parseString(value?.updated_at, "plan.updated_at"),
  };
}

function parseList(raw: unknown): MembershipPlansList {
  const value = raw as RawList;
  if (!Array.isArray(value?.plans)) {
    throw new MembershipPlansApiError("response.plans must be an array");
  }
  return {
    plans: value.plans.map(parsePlan),
    total: typeof value?.total === "number" ? value.total : 0,
    page: typeof value?.page === "number" ? value.page : 1,
    perPage: typeof value?.per_page === "number" ? value.per_page : value.plans.length,
  };
}

function planRequestBody(plan: Partial<MembershipPlanInput>): unknown {
  const body: Record<string, unknown> = {};
  if (plan.name !== undefined) body["name"] = plan.name;
  if (plan.description !== undefined) body["description"] = plan.description;
  if (plan.billingCycle !== undefined) body["billing_cycle"] = plan.billingCycle;
  if (plan.price !== undefined) body["price"] = plan.price;
  if (plan.benefits !== undefined) body["benefits"] = plan.benefits;
  if (plan.stripePriceId !== undefined) body["stripe_price_id"] = plan.stripePriceId;
  return body;
}

function tenantHeaders(tenantId: string): HeadersInit {
  return { "x-tenant-id": tenantId };
}

async function readPlanResponse(res: Response, label: string): Promise<MembershipPlan> {
  if (!res.ok) {
    throw new MembershipPlansApiError(`${label}: HTTP ${res.status}`);
  }
  try {
    return parsePlan(await res.json());
  } catch (err) {
    if (err instanceof MembershipPlansApiError) throw err;
    throw new MembershipPlansApiError(`${label}: invalid JSON`, err);
  }
}

export async function listMembershipPlans(opts: ListMembershipPlansOptions): Promise<MembershipPlansList> {
  if (!opts.baseUrl) throw new MembershipPlansApiError("listMembershipPlans: baseUrl is required");
  if (!opts.tenantId) throw new MembershipPlansApiError("listMembershipPlans: tenantId is required");
  const fetchImpl = opts.fetchImpl ?? fetch;
  const params = new URLSearchParams();
  if (opts.page) params.set("page", String(opts.page));
  if (opts.perPage) params.set("per_page", String(opts.perPage));
  const query = params.toString();
  const url = `${opts.baseUrl}/api/v1/membership-plans${query ? `?${query}` : ""}`;
  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: "GET",
      headers: { accept: "application/json", ...tenantHeaders(opts.tenantId) },
      signal: opts.signal,
    });
  } catch (err) {
    throw new MembershipPlansApiError("listMembershipPlans: network error", err);
  }
  if (!res.ok) {
    throw new MembershipPlansApiError(`listMembershipPlans: HTTP ${res.status}`);
  }
  try {
    return parseList(await res.json());
  } catch (err) {
    if (err instanceof MembershipPlansApiError) throw err;
    throw new MembershipPlansApiError("listMembershipPlans: invalid JSON", err);
  }
}

export async function fetchMembershipPlan(opts: FetchMembershipPlanOptions): Promise<MembershipPlan> {
  if (!opts.baseUrl) throw new MembershipPlansApiError("fetchMembershipPlan: baseUrl is required");
  if (!opts.tenantId) throw new MembershipPlansApiError("fetchMembershipPlan: tenantId is required");
  if (!opts.planId) throw new MembershipPlansApiError("fetchMembershipPlan: planId is required");
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(
      `${opts.baseUrl}/api/v1/membership-plans/${encodeURIComponent(opts.planId)}`,
      {
        method: "GET",
        headers: { accept: "application/json", ...tenantHeaders(opts.tenantId) },
        signal: opts.signal,
      },
    );
  } catch (err) {
    throw new MembershipPlansApiError("fetchMembershipPlan: network error", err);
  }
  return readPlanResponse(res, "fetchMembershipPlan");
}

export async function createMembershipPlan(opts: CreateMembershipPlanOptions): Promise<MembershipPlan> {
  if (!opts.baseUrl) throw new MembershipPlansApiError("createMembershipPlan: baseUrl is required");
  if (!opts.tenantId) throw new MembershipPlansApiError("createMembershipPlan: tenantId is required");
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(`${opts.baseUrl}/api/v1/membership-plans`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...tenantHeaders(opts.tenantId),
      },
      body: JSON.stringify(planRequestBody(opts.plan)),
      signal: opts.signal,
    });
  } catch (err) {
    throw new MembershipPlansApiError("createMembershipPlan: network error", err);
  }
  return readPlanResponse(res, "createMembershipPlan");
}

export async function updateMembershipPlan(opts: UpdateMembershipPlanOptions): Promise<MembershipPlan> {
  if (!opts.baseUrl) throw new MembershipPlansApiError("updateMembershipPlan: baseUrl is required");
  if (!opts.tenantId) throw new MembershipPlansApiError("updateMembershipPlan: tenantId is required");
  if (!opts.planId) throw new MembershipPlansApiError("updateMembershipPlan: planId is required");
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(
      `${opts.baseUrl}/api/v1/membership-plans/${encodeURIComponent(opts.planId)}`,
      {
        method: "PATCH",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          ...tenantHeaders(opts.tenantId),
        },
        body: JSON.stringify(planRequestBody(opts.plan)),
        signal: opts.signal,
      },
    );
  } catch (err) {
    throw new MembershipPlansApiError("updateMembershipPlan: network error", err);
  }
  return readPlanResponse(res, "updateMembershipPlan");
}

export async function deleteMembershipPlan(opts: DeleteMembershipPlanOptions): Promise<void> {
  if (!opts.baseUrl) throw new MembershipPlansApiError("deleteMembershipPlan: baseUrl is required");
  if (!opts.tenantId) throw new MembershipPlansApiError("deleteMembershipPlan: tenantId is required");
  if (!opts.planId) throw new MembershipPlansApiError("deleteMembershipPlan: planId is required");
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(
      `${opts.baseUrl}/api/v1/membership-plans/${encodeURIComponent(opts.planId)}`,
      {
        method: "DELETE",
        headers: tenantHeaders(opts.tenantId),
        signal: opts.signal,
      },
    );
  } catch (err) {
    throw new MembershipPlansApiError("deleteMembershipPlan: network error", err);
  }
  if (!res.ok) {
    throw new MembershipPlansApiError(`deleteMembershipPlan: HTTP ${res.status}`);
  }
}
