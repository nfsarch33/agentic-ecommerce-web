// Domain entities for the v2.4.0 marketplace plugin framework.
//
// Mirrors the Go state machine in internal/marketplace/state.go on
// the backend. The transition table here is the authoritative
// client-side guard for activate/deactivate/uninstall buttons and
// for E2E expectations. Every legal triple matches the backend's
// transitionTable; every illegal combination throws
// IllegalInstallationTransitionError before the network call.

export type InstallationState = "installed" | "active" | "deactivated" | "uninstalled";

export type InstallationTransition = "activate" | "deactivate" | "uninstall";

export interface PluginManifestDependency {
  readonly slug: string;
  readonly constraint?: string;
}

export interface PluginManifest {
  readonly slug: string;
  readonly name: string;
  readonly version: string;
  readonly vendor: string;
  readonly description?: string;
  readonly category?: string;
  readonly homepageUrl?: string;
  readonly eventSubscriptions: readonly string[];
  readonly permissions: readonly string[];
  readonly dependencies: readonly PluginManifestDependency[];
}

export interface Installation {
  readonly tenantId: string;
  readonly slug: string;
  readonly installedVersion: string;
  readonly state: InstallationState;
  readonly installedAt: string;
  readonly activatedAt?: string;
  readonly updatedAt: string;
}

export class IllegalInstallationTransitionError extends Error {
  readonly from: InstallationState;
  readonly via: InstallationTransition;
  constructor(from: InstallationState, via: InstallationTransition) {
    super(`Illegal installation transition: ${from} -> ${via}`);
    this.name = "IllegalInstallationTransitionError";
    this.from = from;
    this.via = via;
  }
}

const transitionTable: Readonly<
  Record<InstallationState, Partial<Record<InstallationTransition, InstallationState>>>
> = Object.freeze({
  installed: { activate: "active", uninstall: "uninstalled" },
  active: { deactivate: "deactivated", uninstall: "uninstalled" },
  deactivated: { activate: "active", uninstall: "uninstalled" },
  uninstalled: {},
});

export function nextInstallationState(
  from: InstallationState,
  via: InstallationTransition,
): InstallationState {
  const next = transitionTable[from]?.[via];
  if (!next) throw new IllegalInstallationTransitionError(from, via);
  return next;
}

export function canActivate(state: InstallationState): boolean {
  return Boolean(transitionTable[state]?.activate);
}

export function canDeactivate(state: InstallationState): boolean {
  return Boolean(transitionTable[state]?.deactivate);
}

export function canUninstall(state: InstallationState): boolean {
  return Boolean(transitionTable[state]?.uninstall);
}

export function isInstallationTerminal(state: InstallationState): boolean {
  const moves = transitionTable[state];
  return !moves || Object.keys(moves).length === 0;
}

export function installationStateLabel(state: InstallationState): string {
  switch (state) {
    case "installed":
      return "Installed";
    case "active":
      return "Active";
    case "deactivated":
      return "Deactivated";
    case "uninstalled":
      return "Uninstalled";
  }
}

export function installationStateTone(
  state: InstallationState,
): "neutral" | "ok" | "warn" | "danger" {
  switch (state) {
    case "installed":
      return "neutral";
    case "active":
      return "ok";
    case "deactivated":
      return "warn";
    case "uninstalled":
      return "danger";
  }
}

export function isInstallationState(value: string): value is InstallationState {
  return value === "installed" || value === "active" || value === "deactivated" || value === "uninstalled";
}

export function allLegalInstallationTransitions(): ReadonlyArray<{
  from: InstallationState;
  via: InstallationTransition;
  to: InstallationState;
}> {
  const out: { from: InstallationState; via: InstallationTransition; to: InstallationState }[] = [];
  for (const [from, moves] of Object.entries(transitionTable)) {
    for (const [via, to] of Object.entries(moves ?? {})) {
      out.push({
        from: from as InstallationState,
        via: via as InstallationTransition,
        to: to as InstallationState,
      });
    }
  }
  return out;
}

const SLUG_RE = /^[a-z][a-z0-9-]*[a-z0-9]$/;
const SEMVER_RE = /^\d+\.\d+\.\d+$/;

export function isValidPluginSlug(value: string): boolean {
  return SLUG_RE.test(value);
}

export function isValidSemver(value: string): boolean {
  return SEMVER_RE.test(value);
}
