import { MarketplaceApiError } from "@/lib/adapters/api/marketplace";
import {
  approveMarketplaceSubmission as approveAdapter,
  getMarketplaceSubmission as getAdapter,
  listMarketplaceSubmissions as listAdapter,
  rejectMarketplaceSubmission as rejectAdapter,
  submitMarketplacePlugin as submitAdapter,
} from "@/lib/adapters/api/marketplace-submissions";
import type {
  ListSubmissionsOptions,
  MarketplaceSubmission,
  MarketplaceSubmissionsList,
  SubmissionIdOptions,
  SubmitMarketplacePluginOptions,
} from "@/lib/adapters/api/marketplace-submissions";

export type SubmissionResult =
  | { readonly ok: true; readonly submission: MarketplaceSubmission }
  | { readonly ok: false; readonly error: string };

export type SubmissionsListResult =
  | { readonly ok: true; readonly list: MarketplaceSubmissionsList }
  | { readonly ok: false; readonly error: string };

export interface SubmissionUsecaseDeps {
  readonly submitImpl?: (opts: SubmitMarketplacePluginOptions) => Promise<MarketplaceSubmission>;
  readonly listImpl?: (opts: ListSubmissionsOptions) => Promise<MarketplaceSubmissionsList>;
  readonly getImpl?: (opts: SubmissionIdOptions) => Promise<MarketplaceSubmission>;
  readonly approveImpl?: (opts: SubmissionIdOptions) => Promise<MarketplaceSubmission>;
  readonly rejectImpl?: (opts: SubmissionIdOptions) => Promise<MarketplaceSubmission>;
}

function ok(submission: MarketplaceSubmission): SubmissionResult {
  return { ok: true, submission };
}

function fail(err: unknown): SubmissionResult {
  return { ok: false, error: errorMessage(err) };
}

function failList(err: unknown): SubmissionsListResult {
  return { ok: false, error: errorMessage(err) };
}

function errorMessage(err: unknown): string {
  if (err instanceof MarketplaceApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "unknown error";
}

export async function submitPluginUsecase(
  opts: SubmitMarketplacePluginOptions,
  deps: SubmissionUsecaseDeps = {},
): Promise<SubmissionResult> {
  const fn = deps.submitImpl ?? submitAdapter;
  try {
    return ok(await fn(opts));
  } catch (err) {
    return fail(err);
  }
}

export async function listSubmissionsUsecase(
  opts: ListSubmissionsOptions,
  deps: SubmissionUsecaseDeps = {},
): Promise<SubmissionsListResult> {
  const fn = deps.listImpl ?? listAdapter;
  try {
    return { ok: true, list: await fn(opts) };
  } catch (err) {
    return failList(err);
  }
}

export async function getSubmissionUsecase(
  opts: SubmissionIdOptions,
  deps: SubmissionUsecaseDeps = {},
): Promise<SubmissionResult> {
  const fn = deps.getImpl ?? getAdapter;
  try {
    return ok(await fn(opts));
  } catch (err) {
    return fail(err);
  }
}

export async function approveSubmissionUsecase(
  opts: SubmissionIdOptions,
  deps: SubmissionUsecaseDeps = {},
): Promise<SubmissionResult> {
  const fn = deps.approveImpl ?? approveAdapter;
  try {
    return ok(await fn(opts));
  } catch (err) {
    return fail(err);
  }
}

export async function rejectSubmissionUsecase(
  opts: SubmissionIdOptions,
  deps: SubmissionUsecaseDeps = {},
): Promise<SubmissionResult> {
  const fn = deps.rejectImpl ?? rejectAdapter;
  try {
    return ok(await fn(opts));
  } catch (err) {
    return fail(err);
  }
}
