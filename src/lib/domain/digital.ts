// Domain entity: digital goods.
//
// Mirrors the Go licence state machine in
// internal/domain/digital/state.go on the backend. The transition
// table here is the authoritative client-side guard for the revoke
// button and for E2E expectations. Every legal triple matches the
// backend's transitionTable; every illegal combination throws
// IllegalLicenseTransitionError before the network call.

export type LicenseState = "active" | "revoked" | "expired";

export type LicenseTransition = "revoke" | "expire";

export type AccessGrantSource = "purchase" | "gift" | "admin";

export type ProductType = "physical" | "digital" | "membership";

export interface DigitalProduct {
  readonly id: string;
  readonly tenantId: string;
  readonly sku: string;
  readonly name: string;
  readonly description?: string;
  readonly filePath: string;
  readonly fileSize: number;
  readonly contentType?: string;
  readonly checksum?: string;
  readonly version: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface License {
  readonly id: string;
  readonly tenantId: string;
  readonly productId: string;
  readonly customerId: string;
  readonly key: string;
  readonly state: LicenseState;
  readonly issuedAt: string;
  readonly expiresAt?: string;
  readonly maxActivations: number;
  readonly updatedAt: string;
}

export interface DigitalDownload {
  readonly url: string;
  readonly expiresAt: string;
  readonly usesAllowed: number;
}

export class IllegalLicenseTransitionError extends Error {
  readonly from: LicenseState;
  readonly via: LicenseTransition;
  constructor(from: LicenseState, via: LicenseTransition) {
    super(`Illegal licence transition: ${from} -> ${via}`);
    this.name = "IllegalLicenseTransitionError";
    this.from = from;
    this.via = via;
  }
}

// transitionTable encodes every legal (state, transition) -> state
// triple. Anything missing is by definition illegal. Mirrors the Go
// transitionTable byte-for-byte so the two state machines stay in
// lockstep.
const transitionTable: Readonly<
  Record<LicenseState, Partial<Record<LicenseTransition, LicenseState>>>
> = Object.freeze({
  active: { revoke: "revoked", expire: "expired" },
  revoked: {},
  expired: {},
});

export function nextLicenseState(
  from: LicenseState,
  via: LicenseTransition,
): LicenseState {
  const next = transitionTable[from]?.[via];
  if (!next) throw new IllegalLicenseTransitionError(from, via);
  return next;
}

export function canRevoke(state: LicenseState): boolean {
  return Boolean(transitionTable[state]?.revoke);
}

export function isLicenseTerminal(state: LicenseState): boolean {
  const moves = transitionTable[state];
  return !moves || Object.keys(moves).length === 0;
}

export function isLicenseUsable(state: LicenseState): boolean {
  return state === "active";
}

export function licenseStateLabel(state: LicenseState): string {
  switch (state) {
    case "active":
      return "Active";
    case "revoked":
      return "Revoked";
    case "expired":
      return "Expired";
  }
}

export function licenseStateTone(
  state: LicenseState,
): "ok" | "warn" | "danger" {
  switch (state) {
    case "active":
      return "ok";
    case "expired":
      return "warn";
    case "revoked":
      return "danger";
  }
}

export function isLicenseState(value: string): value is LicenseState {
  return value === "active" || value === "revoked" || value === "expired";
}

export function isProductType(value: string): value is ProductType {
  return value === "physical" || value === "digital" || value === "membership";
}

export function allLegalLicenseTransitions(): ReadonlyArray<{
  from: LicenseState;
  via: LicenseTransition;
  to: LicenseState;
}> {
  const out: { from: LicenseState; via: LicenseTransition; to: LicenseState }[] = [];
  for (const [from, moves] of Object.entries(transitionTable)) {
    for (const [via, to] of Object.entries(moves ?? {})) {
      out.push({
        from: from as LicenseState,
        via: via as LicenseTransition,
        to: to as LicenseState,
      });
    }
  }
  return out;
}
