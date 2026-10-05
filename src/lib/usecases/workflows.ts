import {
  fetchWorkflowDetail,
  fetchWorkflowList,
  sendWorkflowReviewSignal,
  startProductPublishWorkflow,
  type FetchWorkflowDetailOptions,
  type FetchWorkflowListOptions,
  type SendWorkflowReviewSignalOptions,
  type StartProductPublishWorkflowOptions,
} from "@/lib/adapters/api/workflows";
import {
  countWorkflowsByStatus,
  type ReviewSignal,
  type WorkflowDetail,
  type WorkflowStatus,
  type WorkflowStatusCounts,
  type WorkflowSummary,
} from "@/lib/domain/workflow";

export interface LoadWorkflowListInput {
  readonly baseUrl: string;
  readonly status?: WorkflowStatus;
  readonly limit?: number;
}

export interface LoadWorkflowListResult {
  readonly workflows: readonly WorkflowSummary[];
  readonly counts: WorkflowStatusCounts;
}

export interface WorkflowUsecaseDeps {
  /** A fetch with the session bearer attached (server components); when
   * set it rides along to the adapter calls that talk to the backend. */
  readonly fetchImpl?: typeof fetch;
  readonly fetchWorkflowListImpl?: (opts: FetchWorkflowListOptions) => Promise<WorkflowSummary[]>;
  readonly fetchWorkflowDetailImpl?: (opts: FetchWorkflowDetailOptions) => Promise<WorkflowDetail>;
  readonly startProductPublishWorkflowImpl?: (
    opts: StartProductPublishWorkflowOptions,
  ) => Promise<WorkflowSummary>;
  readonly sendWorkflowReviewSignalImpl?: (
    opts: SendWorkflowReviewSignalOptions,
  ) => Promise<WorkflowDetail>;
}

export interface LoadWorkflowDetailInput {
  readonly baseUrl: string;
  readonly workflowId: string;
}

export interface StartProductPublishInput {
  readonly baseUrl: string;
  readonly productId: string;
  readonly description?: string;
}

export interface SendReviewSignalForWorkflowInput {
  readonly baseUrl: string;
  readonly workflowId: string;
  readonly signal: ReviewSignal;
  readonly note?: string;
  readonly reviewer?: string;
}

function requiredId(input: string, label: string): string {
  const value = input.trim();
  if (value === "") throw new Error(`${label} is required`);
  return value;
}

function optionalText(input: string | undefined): string | undefined {
  const value = input?.trim();
  return value ? value : undefined;
}

export async function loadWorkflowList(
  input: LoadWorkflowListInput,
  deps: WorkflowUsecaseDeps = {},
): Promise<LoadWorkflowListResult> {
  const impl = deps.fetchWorkflowListImpl ?? fetchWorkflowList;
  const workflows = await impl({
    baseUrl: input.baseUrl,
    status: input.status,
    limit: input.limit,
    // fetchImpl carries the session bearer in server components: the
    // backend's /api/v1/workflows is RBAC-authed, and the default fetch
    // sends no Authorization at all (it only worked while the backend
    // ran unauthenticated).
    ...(deps.fetchImpl ? { fetchImpl: deps.fetchImpl } : {}),
  });
  return {
    workflows,
    counts: countWorkflowsByStatus(workflows),
  };
}

export async function loadWorkflowDetail(
  input: LoadWorkflowDetailInput,
  deps: WorkflowUsecaseDeps = {},
): Promise<WorkflowDetail> {
  const impl = deps.fetchWorkflowDetailImpl ?? fetchWorkflowDetail;
  return impl({
    baseUrl: input.baseUrl,
    workflowId: requiredId(input.workflowId, "workflowId"),
  });
}

export async function startProductPublish(
  input: StartProductPublishInput,
  deps: WorkflowUsecaseDeps = {},
): Promise<WorkflowSummary> {
  const impl = deps.startProductPublishWorkflowImpl ?? startProductPublishWorkflow;
  return impl({
    baseUrl: input.baseUrl,
    productId: requiredId(input.productId, "productId"),
    description: optionalText(input.description),
  });
}

export async function sendReviewSignalForWorkflow(
  input: SendReviewSignalForWorkflowInput,
  deps: WorkflowUsecaseDeps = {},
): Promise<WorkflowDetail> {
  const impl = deps.sendWorkflowReviewSignalImpl ?? sendWorkflowReviewSignal;
  return impl({
    baseUrl: input.baseUrl,
    workflowId: requiredId(input.workflowId, "workflowId"),
    signal: input.signal,
    note: optionalText(input.note),
    ...(input.reviewer ? { reviewer: input.reviewer } : {}),
  });
}
