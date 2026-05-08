// Domain entity: Membership.
//
// Mirrors the Go state machine in
// internal/domain/membership/state.go on the backend. The transition
// table here is the authoritative client-side guard for action buttons
// (cancel/pause/resume) and for E2E expectations.

import type { Money } from "./product";

export type MembershipState = "trial" | "active" | "paused" | "cancelled" | "expired";

export type MembershipTransition =
  | "activate"
  | "pause"
  | "resume"
  | "cancel"
  | "expire"
  | "renew";

export type BillingCycle = "monthly" | "annual";

export interface Member {
  readonly id: string;
  readonly tenantId: string;
  readonly email: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface MembershipPlan {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly description?: string;
  readonly billingCycle: BillingCycle;
  readonly price: Money;
  readonly benefits: readonly string[];
  readonly stripePriceId?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface Subscription {
  readonly id: string;
  readonly tenantId: string;
  readonly memberId: string;
  readonly memberEmail: string;
  readonly planId: string;
  readonly state: MembershipState;
  readonly currentPeriodStart: string;
  readonly currentPeriodEnd: string;
  readonly trialEndsAt: string;
  readonly stripeSubscriptionId?: string;
  readonly cancelledAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly plan: MembershipPlan;
}

export class MembershipValidationError extends Error {
  override readonly name = "MembershipValidationError";
}

const STATES: readonly MembershipState[] = ["trial", "active", "paused", "cancelled", "expired"];
const TERMINAL: ReadonlySet<MembershipState> = new Set(["cancelled", "expired"]);
const TRANSITIONS: readonly MembershipTransition[] = [
  "activate",
  "pause",
  "resume",
  "cancel",
  "expire",
  "renew",
];
const BILLING_CYCLES: readonly BillingCycle[] = ["monthly", "annual"];

// transitionTable mirrors internal/domain/membership/state.go on the
// backend. Anything missing here is illegal and triggers an
// invalid-transition error.
const transitionTable: Record<MembershipState, Partial<Record<MembershipTransition, MembershipState>>> = {
  trial: { activate: "active", cancel: "cancelled", expire: "expired" },
  active: { pause: "paused", renew: "active", cancel: "cancelled", expire: "expired" },
  paused: { resume: "active", cancel: "cancelled" },
  cancelled: {},
  expired: {},
};

export function isMembershipState(value: unknown): value is MembershipState {
  return typeof value === "string" && (STATES as readonly string[]).includes(value);
}

export function isTerminalState(state: MembershipState): boolean {
  return TERMINAL.has(state);
}

export function isMembershipTransition(value: unknown): value is MembershipTransition {
  return typeof value === "string" && (TRANSITIONS as readonly string[]).includes(value);
}

export function isBillingCycle(value: unknown): value is BillingCycle {
  return typeof value === "string" && (BILLING_CYCLES as readonly string[]).includes(value);
}

export function parseMembershipState(value: unknown): MembershipState {
  if (!isMembershipState(value)) {
    throw new MembershipValidationError(`invalid membership state: ${JSON.stringify(value)}`);
  }
  return value;
}

export function nextState(from: MembershipState, transition: MembershipTransition): MembershipState {
  const target = transitionTable[from][transition];
  if (!target) {
    throw new MembershipValidationError(
      `invalid transition: ${from} -> ${transition}`,
    );
  }
  return target;
}

export function canTransition(from: MembershipState, transition: MembershipTransition): boolean {
  return Boolean(transitionTable[from][transition]);
}

// availableActions returns the set of user-driven transitions that are
// legal from the current state. Renew/expire are system-driven and
// excluded from the action set.
export function availableActions(state: MembershipState): readonly MembershipTransition[] {
  const moves = transitionTable[state];
  const userActions: readonly MembershipTransition[] = ["pause", "resume", "cancel"];
  return userActions.filter((t) => Boolean(moves[t]));
}

const STATE_LABELS: Record<MembershipState, string> = {
  trial: "Trial",
  active: "Active",
  paused: "Paused",
  cancelled: "Cancelled",
  expired: "Expired",
};

export function stateLabel(state: MembershipState): string {
  return STATE_LABELS[state];
}

const STATE_TONES: Record<MembershipState, "info" | "success" | "warning" | "danger" | "muted"> = {
  trial: "info",
  active: "success",
  paused: "warning",
  cancelled: "danger",
  expired: "muted",
};

export function stateTone(
  state: MembershipState,
): "info" | "success" | "warning" | "danger" | "muted" {
  return STATE_TONES[state];
}
