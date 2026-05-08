import {
  BillingApiError,
  cancelBillingSubscription as adapterCancel,
  pauseBillingSubscription as adapterPause,
  resumeBillingSubscription as adapterResume,
  type SubscriptionSlugOptions,
} from "@/lib/adapters/api/billing";
import type { Subscription } from "@/lib/domain/billing";
import { canCancel, canPause, canResume } from "@/lib/domain/billing";

export type BillingActionResult =
  | { readonly ok: true; readonly subscription: Subscription }
  | { readonly ok: false; readonly error: string };

export interface BillingActionDeps {
  readonly cancelImpl?: (opts: SubscriptionSlugOptions) => Promise<Subscription>;
  readonly pauseImpl?: (opts: SubscriptionSlugOptions) => Promise<Subscription>;
  readonly resumeImpl?: (opts: SubscriptionSlugOptions) => Promise<Subscription>;
}

function toError(err: unknown): BillingActionResult {
  if (err instanceof BillingApiError) return { ok: false, error: err.message };
  if (err instanceof Error) return { ok: false, error: err.message };
  return { ok: false, error: "unknown error" };
}

export async function cancelSubscriptionUsecase(
  current: Pick<Subscription, "state">,
  opts: SubscriptionSlugOptions,
  deps: BillingActionDeps = {},
): Promise<BillingActionResult> {
  if (!canCancel(current.state)) {
    return { ok: false, error: `cannot cancel from state ${current.state}` };
  }
  const fn = deps.cancelImpl ?? adapterCancel;
  try {
    return { ok: true, subscription: await fn(opts) };
  } catch (err) {
    return toError(err);
  }
}

export async function pauseSubscriptionUsecase(
  current: Pick<Subscription, "state">,
  opts: SubscriptionSlugOptions,
  deps: BillingActionDeps = {},
): Promise<BillingActionResult> {
  if (!canPause(current.state)) {
    return { ok: false, error: `cannot pause from state ${current.state}` };
  }
  const fn = deps.pauseImpl ?? adapterPause;
  try {
    return { ok: true, subscription: await fn(opts) };
  } catch (err) {
    return toError(err);
  }
}

export async function resumeSubscriptionUsecase(
  current: Pick<Subscription, "state">,
  opts: SubscriptionSlugOptions,
  deps: BillingActionDeps = {},
): Promise<BillingActionResult> {
  if (!canResume(current.state)) {
    return { ok: false, error: `cannot resume from state ${current.state}` };
  }
  const fn = deps.resumeImpl ?? adapterResume;
  try {
    return { ok: true, subscription: await fn(opts) };
  } catch (err) {
    return toError(err);
  }
}
