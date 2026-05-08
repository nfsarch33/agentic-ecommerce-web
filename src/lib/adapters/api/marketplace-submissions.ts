// HTTP adapter for /api/v1/marketplace/plugins/submit and the
// /api/v1/admin/marketplace/submissions/* admin surface introduced
// in v2.7.0. Defensive parsing keeps the calling layer free of
// `any` and surfaces backend payload bugs early. Mirrors the
// marketplace.ts adapter shape so wiring stays familiar.

import { MarketplaceApiError, parseManifest } from "@/lib/adapters/api/marketplace";
import type { PluginManifest } from "@/lib/domain/marketplace";

export { MarketplaceApiError } from "@/lib/adapters/api/marketplace";

export const SUBMISSION_STATES = ["pending_review", "approved", "rejected"] as const;
export type SubmissionState = (typeof SUBMISSION_STATES)[number];

export function isSubmissionState(value: string): value is SubmissionState {
  return (SUBMISSION_STATES as readonly string[]).includes(value);
}

export interface MarketplaceSubmission {
  readonly id: string;
  readonly tenantId: string;
  readonly submitterEmail: string;
  readonly manifest: PluginManifest;
  readonly state: SubmissionState;
  readonly reviewNotes?: string;
  readonly submittedAt: string;
  readonly reviewedAt?: string;
  readonly reviewer?: string;
}

export interface MarketplaceSubmissionsList {
  readonly submissions: readonly MarketplaceSubmission[];
  readonly total: number;
  readonly page: number;
  readonly perPage: number;
}

export interface SubmissionRequestBase {
  readonly baseUrl: string;
  readonly tenantId?: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface SubmitMarketplacePluginOptions extends SubmissionRequestBase {
  readonly tenantId: string;
  readonly submitterEmail: string;
  readonly manifest: PluginManifest;
}

export interface ListSubmissionsOptions extends SubmissionRequestBase {
  readonly page?: number;
  readonly perPage?: number;
}

export interface SubmissionIdOptions extends SubmissionRequestBase {
  readonly id: string;
  readonly reviewNotes?: string;
}

interface RawSubmission {
  readonly id?: unknown;
  readonly tenant_id?: unknown;
  readonly submitter_email?: unknown;
  readonly manifest?: unknown;
  readonly state?: unknown;
  readonly review_notes?: unknown;
  readonly submitted_at?: unknown;
  readonly reviewed_at?: unknown;
  readonly reviewer?: unknown;
}

interface RawSubmissionsList {
  readonly submissions?: unknown;
  readonly total?: unknown;
  readonly page?: unknown;
  readonly per_page?: unknown;
}

function asString(value: unknown, label: string): string {
  if (typeof value !== "string" || value === "") {
    throw new MarketplaceApiError(`${label} must be a non-empty string`);
  }
  return value;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

function asNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new MarketplaceApiError(`${label} must be a number`);
  }
  return value;
}

export function parseSubmission(raw: unknown): MarketplaceSubmission {
  const value = raw as RawSubmission;
  const state = asString(value?.state, "submission.state");
  if (!isSubmissionState(state)) {
    throw new MarketplaceApiError(`submission.state invalid: ${state}`);
  }
  return {
    id: asString(value?.id, "submission.id"),
    tenantId: asString(value?.tenant_id, "submission.tenant_id"),
    submitterEmail: asString(value?.submitter_email, "submission.submitter_email"),
    manifest: parseManifest(value?.manifest),
    state,
    reviewNotes: asOptionalString(value?.review_notes),
    submittedAt: asString(value?.submitted_at, "submission.submitted_at"),
    reviewedAt: asOptionalString(value?.reviewed_at),
    reviewer: asOptionalString(value?.reviewer),
  };
}

function parseSubmissionsList(raw: unknown): MarketplaceSubmissionsList {
  const value = raw as RawSubmissionsList;
  const items = Array.isArray(value?.submissions) ? value!.submissions : [];
  return {
    submissions: items.map(parseSubmission),
    total: asNumber(value?.total, "submissions.total"),
    page: asNumber(value?.page, "submissions.page"),
    perPage: asNumber(value?.per_page, "submissions.per_page"),
  };
}

async function readJSON(res: Response, label: string): Promise<unknown> {
  if (!res.ok) {
    throw new MarketplaceApiError(`${label}: HTTP ${res.status}`, res.status);
  }
  try {
    return await res.json();
  } catch (err) {
    throw new MarketplaceApiError(`${label}: invalid JSON`, res.status, err);
  }
}

function tenantHeaders(tenantId: string): HeadersInit {
  return { "x-tenant-id": tenantId, "content-type": "application/json" };
}

export async function submitMarketplacePlugin(opts: SubmitMarketplacePluginOptions): Promise<MarketplaceSubmission> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const body = {
    submitter_email: opts.submitterEmail,
    slug: opts.manifest.slug,
    name: opts.manifest.name,
    version: opts.manifest.version,
    vendor: opts.manifest.vendor,
    description: opts.manifest.description ?? "",
    category: opts.manifest.category ?? "",
    homepage_url: opts.manifest.homepageUrl ?? "",
    event_subscriptions: opts.manifest.eventSubscriptions ?? [],
    permissions: opts.manifest.permissions ?? [],
    dependencies: (opts.manifest.dependencies ?? []).map((d) => ({
      slug: d.slug,
      constraint: d.constraint ?? "",
    })),
  };
  const res = await fetchImpl(`${opts.baseUrl}/api/v1/marketplace/plugins/submit`, {
    method: "POST",
    headers: tenantHeaders(opts.tenantId),
    body: JSON.stringify(body),
    signal: opts.signal,
  });
  return parseSubmission(await readJSON(res, "submitMarketplacePlugin"));
}

export async function listMarketplaceSubmissions(opts: ListSubmissionsOptions): Promise<MarketplaceSubmissionsList> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const params = new URLSearchParams();
  if (opts.tenantId) params.set("tenant_id", opts.tenantId);
  if (opts.page !== undefined) params.set("page", String(opts.page));
  if (opts.perPage !== undefined) params.set("per_page", String(opts.perPage));
  const qs = params.toString();
  const url = `${opts.baseUrl}/api/v1/admin/marketplace/submissions${qs ? `?${qs}` : ""}`;
  const res = await fetchImpl(url, { signal: opts.signal });
  return parseSubmissionsList(await readJSON(res, "listMarketplaceSubmissions"));
}

export async function getMarketplaceSubmission(opts: SubmissionIdOptions): Promise<MarketplaceSubmission> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const res = await fetchImpl(`${opts.baseUrl}/api/v1/admin/marketplace/submissions/${encodeURIComponent(opts.id)}`, {
    signal: opts.signal,
  });
  return parseSubmission(await readJSON(res, "getMarketplaceSubmission"));
}

export async function approveMarketplaceSubmission(opts: SubmissionIdOptions): Promise<MarketplaceSubmission> {
  return reviewSubmission(opts, "approve");
}

export async function rejectMarketplaceSubmission(opts: SubmissionIdOptions): Promise<MarketplaceSubmission> {
  return reviewSubmission(opts, "reject");
}

async function reviewSubmission(opts: SubmissionIdOptions, action: "approve" | "reject"): Promise<MarketplaceSubmission> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const body = JSON.stringify({ review_notes: opts.reviewNotes ?? "" });
  const res = await fetchImpl(
    `${opts.baseUrl}/api/v1/admin/marketplace/submissions/${encodeURIComponent(opts.id)}/${action}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      signal: opts.signal,
    },
  );
  return parseSubmission(await readJSON(res, `${action}MarketplaceSubmission`));
}
