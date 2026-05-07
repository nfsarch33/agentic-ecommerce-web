export type WorkflowStatus =
  | "queued"
  | "running"
  | "waiting_review"
  | "completed"
  | "failed"
  | "canceled"
  | "cancelled"
  | "terminated"
  | "continued_as_new"
  | "timed_out"
  | "unspecified";
export type ActivityStatus =
  | "pending"
  | "running"
  | "waiting_review"
  | "completed"
  | "failed"
  | "skipped";
export type ReviewSignal = "approve" | "reject" | "request_changes";

export interface WorkflowSummary {
  readonly id: string;
  readonly type: "product_publish" | string;
  readonly status: WorkflowStatus;
  readonly productId: string;
  readonly productTitle?: string;
  readonly currentActivity?: string;
  readonly startedAt: string;
  readonly updatedAt: string;
  readonly completedAt?: string;
  readonly error?: string;
}

export interface WorkflowActivity {
  readonly id: string;
  readonly name: string;
  readonly status: ActivityStatus;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly message?: string;
  readonly attempt?: number;
  readonly error?: string;
}

export interface WorkflowDetail extends WorkflowSummary {
  readonly activities: readonly WorkflowActivity[];
}

export interface WorkflowStatusCounts {
  readonly running: number;
  readonly completed: number;
  readonly failed: number;
}

export class WorkflowDomainError extends Error {
  override readonly name = "WorkflowDomainError";
}

const workflowStatuses = new Set<WorkflowStatus>([
  "queued",
  "running",
  "waiting_review",
  "completed",
  "failed",
  "canceled",
  "cancelled",
  "terminated",
  "continued_as_new",
  "timed_out",
  "unspecified",
]);

const activityStatuses = new Set<ActivityStatus>([
  "pending",
  "running",
  "waiting_review",
  "completed",
  "failed",
  "skipped",
]);

function parseString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new WorkflowDomainError(`${label} must be a non-empty string`);
  }
  return value.trim();
}

function parseOptionalString(value: unknown, label: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") {
    throw new WorkflowDomainError(`${label} must be a string when present`);
  }
  return value;
}

function parseOptionalNumber(value: unknown, label: string): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new WorkflowDomainError(`${label} must be a finite number when present`);
  }
  return value;
}

function parseWorkflowStatus(value: unknown): WorkflowStatus {
  if (typeof value !== "string" || !workflowStatuses.has(value as WorkflowStatus)) {
    throw new WorkflowDomainError(`workflow.status is invalid: ${String(value)}`);
  }
  return value as WorkflowStatus;
}

function parseActivityStatus(value: unknown): ActivityStatus {
  if (typeof value !== "string" || !activityStatuses.has(value as ActivityStatus)) {
    throw new WorkflowDomainError(`activity.status is invalid: ${String(value)}`);
  }
  return value as ActivityStatus;
}

export function createWorkflowSummary(input: WorkflowSummary): WorkflowSummary {
  return {
    id: parseString(input.id, "workflow.id"),
    type: parseString(input.type, "workflow.type"),
    status: parseWorkflowStatus(input.status),
    productId: parseString(input.productId, "workflow.productId"),
    productTitle: parseOptionalString(input.productTitle, "workflow.productTitle"),
    currentActivity: parseOptionalString(input.currentActivity, "workflow.currentActivity"),
    startedAt: parseString(input.startedAt, "workflow.startedAt"),
    updatedAt: parseString(input.updatedAt, "workflow.updatedAt"),
    completedAt: parseOptionalString(input.completedAt, "workflow.completedAt"),
    error: parseOptionalString(input.error, "workflow.error"),
  };
}

export function createWorkflowActivity(input: WorkflowActivity): WorkflowActivity {
  return {
    id: parseString(input.id, "activity.id"),
    name: parseString(input.name, "activity.name"),
    status: parseActivityStatus(input.status),
    startedAt: parseOptionalString(input.startedAt, "activity.startedAt"),
    completedAt: parseOptionalString(input.completedAt, "activity.completedAt"),
    message: parseOptionalString(input.message, "activity.message"),
    attempt: parseOptionalNumber(input.attempt, "activity.attempt"),
    error: parseOptionalString(input.error, "activity.error"),
  };
}

export function createWorkflowDetail(input: WorkflowDetail): WorkflowDetail {
  return {
    ...createWorkflowSummary(input),
    activities: input.activities.map(createWorkflowActivity),
  };
}

export function workflowStatusLabel(status: WorkflowStatus): string {
  switch (status) {
    case "queued":
      return "Queued";
    case "running":
      return "Running";
    case "waiting_review":
      return "Waiting review";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    case "canceled":
      return "Canceled";
    case "cancelled":
      return "Cancelled";
    case "terminated":
      return "Terminated";
    case "continued_as_new":
      return "Continued as new";
    case "timed_out":
      return "Timed out";
    case "unspecified":
      return "Unspecified";
  }
}

export function workflowStatusTone(
  status: WorkflowStatus,
): "blue" | "amber" | "green" | "red" | "gray" {
  switch (status) {
    case "queued":
    case "running":
      return "blue";
    case "waiting_review":
      return "amber";
    case "completed":
      return "green";
    case "failed":
    case "terminated":
    case "timed_out":
      return "red";
    case "canceled":
    case "cancelled":
    case "continued_as_new":
    case "unspecified":
      return "gray";
  }
}

export function reviewSignalLabel(signal: ReviewSignal): string {
  switch (signal) {
    case "approve":
      return "Approve";
    case "reject":
      return "Reject";
    case "request_changes":
      return "Request changes";
  }
}

export function countWorkflowsByStatus(
  workflows: readonly WorkflowSummary[],
): WorkflowStatusCounts {
  return workflows.reduce<WorkflowStatusCounts>(
    (counts, workflow) => {
      if (workflow.status === "completed") {
        return { ...counts, completed: counts.completed + 1 };
      }
      if (workflow.status === "failed") {
        return { ...counts, failed: counts.failed + 1 };
      }
      if (workflow.status === "terminated" || workflow.status === "timed_out") {
        return { ...counts, failed: counts.failed + 1 };
      }
      if (
        workflow.status === "running" ||
        workflow.status === "queued" ||
        workflow.status === "waiting_review"
      ) {
        return { ...counts, running: counts.running + 1 };
      }
      return counts;
    },
    { running: 0, completed: 0, failed: 0 },
  );
}
