// HTTP adapter for /api/v1/admin/billing/*. Defensive parsing keeps
// the calling layer free of `any` and surfaces backend payload bugs
// early. Mirrors the v2.4.0 marketplace adapter shape.
import type {
  Invoice,
  InvoiceStatus,
  Subscription,
  UsageReport,
} from "@/lib/domain/billing";
import { isInvoiceStatus, isSubscriptionState } from "@/lib/domain/billing";

export class BillingApiError extends Error {
  override readonly name = "BillingApiError";
  override readonly cause?: unknown;
  readonly status?: number;
  constructor(message: string, status?: number, cause?: unknown) {
    super(message);
    this.status = status;
    this.cause = cause;
  }
}

export interface BillingRequestBase {
  readonly baseUrl: string;
  readonly tenantId: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
  readonly authToken?: string;
}

export interface ListBillingOptions extends BillingRequestBase {
  readonly page?: number;
  readonly perPage?: number;
}

export interface SubscriptionSlugOptions extends BillingRequestBase {
  readonly id: string;
}

export interface BillingSubscriptionList {
  readonly subscriptions: readonly Subscription[];
  readonly total: number;
}

export interface BillingInvoiceList {
  readonly invoices: readonly Invoice[];
  readonly total: number;
}

export interface UsageRequestOptions extends BillingRequestBase {
  readonly plan?: string;
}

interface RawSubscription {
  readonly id?: unknown;
  readonly tenant_id?: unknown;
  readonly plan_id?: unknown;
  readonly state?: unknown;
  readonly stripe_subscription_id?: unknown;
  readonly stripe_customer_id?: unknown;
  readonly current_period_start?: unknown;
  readonly current_period_end?: unknown;
  readonly cancel_at_period_end?: unknown;
  readonly created_at?: unknown;
  readonly updated_at?: unknown;
}

interface RawInvoice {
  readonly id?: unknown;
  readonly tenant_id?: unknown;
  readonly subscription_id?: unknown;
  readonly amount?: unknown;
  readonly currency?: unknown;
  readonly status?: unknown;
  readonly period_start?: unknown;
  readonly period_end?: unknown;
  readonly created_at?: unknown;
}

function asString(value: unknown, label: string): string {
  if (typeof value !== "string" || value === "") {
    throw new BillingApiError(`${label} must be a non-empty string`);
  }
  return value;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

function asNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new BillingApiError(`${label} must be a number`);
  }
  return value;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function headers(opts: BillingRequestBase): HeadersInit {
  const out: Record<string, string> = { "x-tenant-id": opts.tenantId };
  if (opts.authToken) out.authorization = `Bearer ${opts.authToken}`;
  return out;
}

async function readJSON(res: Response, label: string): Promise<unknown> {
  if (!res.ok) {
    throw new BillingApiError(`${label}: HTTP ${res.status}`, res.status);
  }
  try {
    return await res.json();
  } catch (err) {
    throw new BillingApiError(`${label}: invalid JSON`, res.status, err);
  }
}

export function parseSubscription(raw: unknown): Subscription {
  const value = raw as RawSubscription;
  const state = asString(value?.state, "subscription.state");
  if (!isSubscriptionState(state)) {
    throw new BillingApiError(`subscription.state invalid: ${state}`);
  }
  return {
    id: asString(value?.id, "subscription.id"),
    tenantId: asString(value?.tenant_id, "subscription.tenant_id"),
    planId: asString(value?.plan_id, "subscription.plan_id"),
    state,
    stripeSubscriptionId: asOptionalString(value?.stripe_subscription_id),
    stripeCustomerId: asOptionalString(value?.stripe_customer_id),
    currentPeriodStart: asString(value?.current_period_start, "subscription.current_period_start"),
    currentPeriodEnd: asString(value?.current_period_end, "subscription.current_period_end"),
    cancelAtPeriodEnd: asBoolean(value?.cancel_at_period_end),
    createdAt: asString(value?.created_at, "subscription.created_at"),
    updatedAt: asString(value?.updated_at, "subscription.updated_at"),
  };
}

export function parseInvoice(raw: unknown): Invoice {
  const value = raw as RawInvoice;
  const status: string = asString(value?.status, "invoice.status");
  if (!isInvoiceStatus(status)) {
    throw new BillingApiError(`invoice.status invalid: ${status}`);
  }
  const typed: InvoiceStatus = status;
  return {
    id: asString(value?.id, "invoice.id"),
    tenantId: asString(value?.tenant_id, "invoice.tenant_id"),
    subscriptionId: asString(value?.subscription_id, "invoice.subscription_id"),
    amount: asNumber(value?.amount, "invoice.amount"),
    currency: asString(value?.currency, "invoice.currency"),
    status: typed,
    periodStart: asString(value?.period_start, "invoice.period_start"),
    periodEnd: asString(value?.period_end, "invoice.period_end"),
    createdAt: asString(value?.created_at, "invoice.created_at"),
  };
}

function paginationParams(opts: ListBillingOptions): URLSearchParams {
  const params = new URLSearchParams();
  if (opts.page) params.set("page", String(opts.page));
  if (opts.perPage) params.set("per_page", String(opts.perPage));
  return params;
}

async function performRequest(
  opts: BillingRequestBase,
  url: string,
  method: string,
  label: string,
): Promise<unknown> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(url, { method, headers: headers(opts), signal: opts.signal });
  } catch (err) {
    throw new BillingApiError(`${label}: network error`, undefined, err);
  }
  return readJSON(res, label);
}

export async function listBillingSubscriptions(
  opts: ListBillingOptions,
): Promise<BillingSubscriptionList & { readonly page: number; readonly perPage: number }> {
  if (!opts.baseUrl) throw new BillingApiError("listBillingSubscriptions: baseUrl required");
  if (!opts.tenantId) throw new BillingApiError("listBillingSubscriptions: tenantId required");
  const params = paginationParams(opts);
  const url = `${opts.baseUrl}/api/v1/admin/billing/subscriptions${params.toString() ? `?${params}` : ""}`;
  const raw = (await performRequest(opts, url, "GET", "listBillingSubscriptions")) as {
    subscriptions?: unknown;
    total?: unknown;
  };
  if (!Array.isArray(raw?.subscriptions)) {
    throw new BillingApiError("listBillingSubscriptions: response.subscriptions must be an array");
  }
  return {
    subscriptions: raw.subscriptions.map(parseSubscription),
    total: typeof raw.total === "number" ? raw.total : 0,
    page: opts.page ?? 1,
    perPage: opts.perPage ?? 20,
  };
}

export async function getBillingSubscription(opts: SubscriptionSlugOptions): Promise<Subscription> {
  if (!opts.id) throw new BillingApiError("getBillingSubscription: id required");
  return parseSubscription(
    await performRequest(
      opts,
      `${opts.baseUrl}/api/v1/admin/billing/subscriptions/${opts.id}`,
      "GET",
      "getBillingSubscription",
    ),
  );
}

async function transitionSubscription(
  opts: SubscriptionSlugOptions,
  action: "cancel" | "pause" | "resume",
): Promise<Subscription> {
  if (!opts.id) throw new BillingApiError(`${action}Subscription: id required`);
  const url = `${opts.baseUrl}/api/v1/admin/billing/subscriptions/${opts.id}/${action}`;
  return parseSubscription(await performRequest(opts, url, "POST", `${action}Subscription`));
}

export function cancelBillingSubscription(opts: SubscriptionSlugOptions): Promise<Subscription> {
  return transitionSubscription(opts, "cancel");
}

export function pauseBillingSubscription(opts: SubscriptionSlugOptions): Promise<Subscription> {
  return transitionSubscription(opts, "pause");
}

export function resumeBillingSubscription(opts: SubscriptionSlugOptions): Promise<Subscription> {
  return transitionSubscription(opts, "resume");
}

export async function listBillingInvoices(
  opts: ListBillingOptions,
): Promise<BillingInvoiceList & { readonly page: number; readonly perPage: number }> {
  if (!opts.baseUrl) throw new BillingApiError("listBillingInvoices: baseUrl required");
  if (!opts.tenantId) throw new BillingApiError("listBillingInvoices: tenantId required");
  const params = paginationParams(opts);
  const url = `${opts.baseUrl}/api/v1/admin/billing/invoices${params.toString() ? `?${params}` : ""}`;
  const raw = (await performRequest(opts, url, "GET", "listBillingInvoices")) as {
    invoices?: unknown;
    total?: unknown;
  };
  if (!Array.isArray(raw?.invoices)) {
    throw new BillingApiError("listBillingInvoices: response.invoices must be an array");
  }
  return {
    invoices: raw.invoices.map(parseInvoice),
    total: typeof raw.total === "number" ? raw.total : 0,
    page: opts.page ?? 1,
    perPage: opts.perPage ?? 20,
  };
}

export async function getBillingInvoice(opts: SubscriptionSlugOptions): Promise<Invoice> {
  if (!opts.id) throw new BillingApiError("getBillingInvoice: id required");
  return parseInvoice(
    await performRequest(
      opts,
      `${opts.baseUrl}/api/v1/admin/billing/invoices/${opts.id}`,
      "GET",
      "getBillingInvoice",
    ),
  );
}

export async function getBillingUsage(opts: UsageRequestOptions): Promise<UsageReport> {
  if (!opts.baseUrl) throw new BillingApiError("getBillingUsage: baseUrl required");
  if (!opts.tenantId) throw new BillingApiError("getBillingUsage: tenantId required");
  const params = new URLSearchParams();
  if (opts.plan) params.set("plan", opts.plan);
  const url = `${opts.baseUrl}/api/v1/admin/billing/usage${params.toString() ? `?${params}` : ""}`;
  const raw = (await performRequest(opts, url, "GET", "getBillingUsage")) as {
    tenant_id?: unknown;
    plan?: unknown;
    period_start?: unknown;
    period_end?: unknown;
    rollups?: unknown;
  };
  if (!Array.isArray(raw?.rollups)) {
    throw new BillingApiError("getBillingUsage: response.rollups must be an array");
  }
  return {
    tenantId: asString(raw?.tenant_id, "usage.tenant_id"),
    plan: asString(raw?.plan, "usage.plan"),
    periodStart: asString(raw?.period_start, "usage.period_start"),
    periodEnd: asString(raw?.period_end, "usage.period_end"),
    rollups: raw.rollups.map((r) => {
      const rec = r as { metric?: unknown; value?: unknown; limit?: unknown };
      return {
        metric: asString(rec?.metric, "usage.rollup.metric"),
        value: asNumber(rec?.value, "usage.rollup.value"),
        limit: asNumber(rec?.limit, "usage.rollup.limit"),
      };
    }),
  };
}
