import {
  createWorkflowDetail,
  createWorkflowSummary,
  type ActivityStatus,
  type ReviewSignal,
  type WorkflowDetail,
  type WorkflowStatus,
  type WorkflowSummary,
} from "@/lib/domain/workflow";

export interface FetchWorkflowListOptions {
  readonly baseUrl: string;
  readonly status?: WorkflowStatus;
  readonly limit?: number;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface FetchWorkflowDetailOptions {
  readonly baseUrl: string;
  readonly workflowId: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface StartProductPublishWorkflowOptions {
  readonly baseUrl: string;
  readonly productId: string;
  readonly description?: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface SendWorkflowReviewSignalOptions {
  readonly baseUrl: string;
  readonly workflowId: string;
  readonly signal: ReviewSignal;
  readonly note?: string;
  readonly fetchImpl?: typeof fetch;
}

export class WorkflowsApiError extends Error {
  override readonly name = "WorkflowsApiError";
  override readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.cause = cause;
  }
}

interface RawWorkflowSummary {
  readonly id?: unknown;
  readonly type?: unknown;
  readonly status?: unknown;
  readonly product_id?: unknown;
  readonly product_title?: unknown;
  readonly current_activity?: unknown;
  readonly started_at?: unknown;
  readonly updated_at?: unknown;
  readonly completed_at?: unknown;
  readonly error?: unknown;
}

interface RawWorkflowActivity {
  readonly id?: unknown;
  readonly name?: unknown;
  readonly status?: unknown;
  readonly started_at?: unknown;
  readonly completed_at?: unknown;
  readonly message?: unknown;
  readonly attempt?: unknown;
  readonly error?: unknown;
}

interface RawWorkflowDetail extends RawWorkflowSummary {
  readonly activities?: unknown;
}

function apiUrl(baseUrl: string, path: string): string {
  if (!baseUrl) throw new WorkflowsApiError("workflows API: baseUrl is required");
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

function parseOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

function parseOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function mapWorkflowSummary(raw: RawWorkflowSummary): WorkflowSummary {
  return createWorkflowSummary({
    id: String(raw.id ?? ""),
    type: String(raw.type ?? ""),
    status: String(raw.status ?? "") as WorkflowStatus,
    productId: String(raw.product_id ?? ""),
    productTitle: parseOptionalString(raw.product_title),
    currentActivity: parseOptionalString(raw.current_activity),
    startedAt: String(raw.started_at ?? ""),
    updatedAt: String(raw.updated_at ?? ""),
    completedAt: parseOptionalString(raw.completed_at),
    error: parseOptionalString(raw.error),
  });
}

function mapWorkflowDetail(raw: RawWorkflowDetail): WorkflowDetail {
  if (!Array.isArray(raw.activities)) {
    throw new WorkflowsApiError("workflow detail response must include activities array");
  }
  return createWorkflowDetail({
    ...mapWorkflowSummary(raw),
    activities: raw.activities.map((activity) => {
      const rawActivity = activity as RawWorkflowActivity;
      return {
        id: String(rawActivity.id ?? ""),
        name: String(rawActivity.name ?? ""),
        status: String(rawActivity.status ?? "") as ActivityStatus,
        startedAt: parseOptionalString(rawActivity.started_at),
        completedAt: parseOptionalString(rawActivity.completed_at),
        message: parseOptionalString(rawActivity.message),
        attempt: parseOptionalNumber(rawActivity.attempt),
        error: parseOptionalString(rawActivity.error),
      };
    }),
  });
}

async function readJson(res: Response, label: string): Promise<unknown> {
  try {
    return await res.json();
  } catch (err) {
    throw new WorkflowsApiError(`${label}: invalid JSON`, err);
  }
}

export async function fetchWorkflowList(opts: FetchWorkflowListOptions): Promise<WorkflowSummary[]> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const params = new URLSearchParams();
  if (opts.status) params.set("status", opts.status);
  if (opts.limit !== undefined) params.set("limit", String(opts.limit));
  const query = params.size > 0 ? `?${params.toString()}` : "";

  let res: Response;
  try {
    res = await fetchImpl(apiUrl(opts.baseUrl, `/api/v1/workflows${query}`), {
      method: "GET",
      headers: { accept: "application/json" },
      signal: opts.signal,
    });
  } catch (err) {
    throw new WorkflowsApiError("fetchWorkflowList: network error", err);
  }
  if (!res.ok) throw new WorkflowsApiError(`fetchWorkflowList: HTTP ${res.status}`);

  const body = (await readJson(res, "fetchWorkflowList")) as { workflows?: unknown };
  if (!Array.isArray(body.workflows)) {
    throw new WorkflowsApiError("fetchWorkflowList: response body must include workflows array");
  }
  return body.workflows.map((workflow) => mapWorkflowSummary(workflow as RawWorkflowSummary));
}

export async function fetchWorkflowDetail(opts: FetchWorkflowDetailOptions): Promise<WorkflowDetail> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const workflowId = encodeURIComponent(opts.workflowId);
  let res: Response;
  try {
    res = await fetchImpl(apiUrl(opts.baseUrl, `/api/v1/workflows/${workflowId}`), {
      method: "GET",
      headers: { accept: "application/json" },
      signal: opts.signal,
    });
  } catch (err) {
    throw new WorkflowsApiError("fetchWorkflowDetail: network error", err);
  }
  if (!res.ok) throw new WorkflowsApiError(`fetchWorkflowDetail: HTTP ${res.status}`);

  return mapWorkflowDetail((await readJson(res, "fetchWorkflowDetail")) as RawWorkflowDetail);
}

export async function startProductPublishWorkflow(
  opts: StartProductPublishWorkflowOptions,
): Promise<WorkflowSummary> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(apiUrl(opts.baseUrl, "/api/v1/workflows/product-publish"), {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({
        product_id: opts.productId,
        ...(opts.description ? { description: opts.description } : {}),
      }),
      signal: opts.signal,
    });
  } catch (err) {
    throw new WorkflowsApiError("startProductPublishWorkflow: network error", err);
  }
  if (!res.ok) throw new WorkflowsApiError(`startProductPublishWorkflow: HTTP ${res.status}`);

  const body = (await readJson(res, "startProductPublishWorkflow")) as { workflow?: unknown };
  if (!body.workflow) {
    throw new WorkflowsApiError("startProductPublishWorkflow: response body must include workflow");
  }
  return mapWorkflowSummary(body.workflow as RawWorkflowSummary);
}

export async function sendWorkflowReviewSignal(
  opts: SendWorkflowReviewSignalOptions,
): Promise<WorkflowSummary> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const workflowId = encodeURIComponent(opts.workflowId);
  let res: Response;
  try {
    res = await fetchImpl(apiUrl(opts.baseUrl, `/api/v1/workflows/${workflowId}/signals/review`), {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({
        signal: opts.signal,
        ...(opts.note ? { note: opts.note } : {}),
      }),
    });
  } catch (err) {
    throw new WorkflowsApiError("sendWorkflowReviewSignal: network error", err);
  }
  if (!res.ok) throw new WorkflowsApiError(`sendWorkflowReviewSignal: HTTP ${res.status}`);

  const body = (await readJson(res, "sendWorkflowReviewSignal")) as { workflow?: unknown };
  if (!body.workflow) {
    throw new WorkflowsApiError("sendWorkflowReviewSignal: response body must include workflow");
  }
  return mapWorkflowSummary(body.workflow as RawWorkflowSummary);
}
