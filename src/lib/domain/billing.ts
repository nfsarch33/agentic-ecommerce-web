// Domain entities for the v2.5.0 billing bounded context.
//
// Mirrors the Go state machine in internal/billing/state.go on the
// backend. Every legal triple matches the backend's transitionTable;
// every illegal combination throws IllegalSubscriptionTransitionError
// before the network call.

export type SubscriptionState = "trialing" | "active" | "past_due" | "paused" | "canceled";

export type SubscriptionTransition =
  | "activate"
  | "mark_past_due"
  | "recover"
  | "pause"
  | "resume"
  | "cancel";

export type InvoiceStatus = "open" | "paid" | "void" | "uncollectible";

export interface Subscription {
  readonly id: string;
  readonly tenantId: string;
  readonly planId: string;
  readonly state: SubscriptionState;
  readonly stripeSubscriptionId?: string;
  readonly stripeCustomerId?: string;
  readonly currentPeriodStart: string;
  readonly currentPeriodEnd: string;
  readonly cancelAtPeriodEnd: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface Invoice {
  readonly id: string;
  readonly tenantId: string;
  readonly subscriptionId: string;
  readonly amount: number;
  readonly currency: string;
  readonly status: InvoiceStatus;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly createdAt: string;
}

export interface UsageRollup {
  readonly metric: string;
  readonly value: number;
  readonly limit: number;
}

export interface UsageReport {
  readonly tenantId: string;
  readonly plan: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly rollups: readonly UsageRollup[];
}

export class IllegalSubscriptionTransitionError extends Error {
  readonly from: SubscriptionState;
  readonly via: SubscriptionTransition;
  constructor(from: SubscriptionState, via: SubscriptionTransition) {
    super(`Illegal billing transition: ${from} -> ${via}`);
    this.name = "IllegalSubscriptionTransitionError";
    this.from = from;
    this.via = via;
  }
}

const transitionTable: Readonly<
  Record<SubscriptionState, Partial<Record<SubscriptionTransition, SubscriptionState>>>
> = Object.freeze({
  trialing: { activate: "active", cancel: "canceled" },
  active: { mark_past_due: "past_due", pause: "paused", cancel: "canceled" },
  past_due: { recover: "active", cancel: "canceled" },
  paused: { resume: "active", cancel: "canceled" },
  canceled: {},
});

export function nextSubscriptionState(
  from: SubscriptionState,
  via: SubscriptionTransition,
): SubscriptionState {
  const next = transitionTable[from]?.[via];
  if (!next) throw new IllegalSubscriptionTransitionError(from, via);
  return next;
}

export function canCancel(state: SubscriptionState): boolean {
  return Boolean(transitionTable[state]?.cancel);
}

export function canPause(state: SubscriptionState): boolean {
  return Boolean(transitionTable[state]?.pause);
}

export function canResume(state: SubscriptionState): boolean {
  return Boolean(transitionTable[state]?.resume);
}

export function canActivate(state: SubscriptionState): boolean {
  return Boolean(transitionTable[state]?.activate);
}

export function isSubscriptionState(value: string): value is SubscriptionState {
  return value === "trialing" || value === "active" || value === "past_due" || value === "paused" || value === "canceled";
}

export function isInvoiceStatus(value: string): value is InvoiceStatus {
  return value === "open" || value === "paid" || value === "void" || value === "uncollectible";
}

export function formatMoneyMinor(amount: number, currency: string): string {
  const major = amount / 100;
  return `${major.toFixed(2)} ${currency}`;
}

export function usagePercent(value: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((value / limit) * 100));
}

export function isOverBudget(rollup: UsageRollup, threshold = 0.8): boolean {
  if (rollup.limit <= 0) return false;
  return rollup.value / rollup.limit >= threshold;
}
