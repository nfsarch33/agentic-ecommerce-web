import { describe, expect, it } from "vitest";
import {
  IllegalInstallationTransitionError,
  allLegalInstallationTransitions,
  canActivate,
  canDeactivate,
  canUninstall,
  installationStateLabel,
  installationStateTone,
  isInstallationState,
  isInstallationTerminal,
  isValidPluginSlug,
  isValidSemver,
  nextInstallationState,
  type InstallationState,
  type InstallationTransition,
} from "./marketplace";

describe("marketplace state machine", () => {
  it("encodes the same triples as the backend", () => {
    expect(allLegalInstallationTransitions()).toEqual(
      expect.arrayContaining([
        { from: "installed", via: "activate", to: "active" },
        { from: "installed", via: "uninstall", to: "uninstalled" },
        { from: "active", via: "deactivate", to: "deactivated" },
        { from: "active", via: "uninstall", to: "uninstalled" },
        { from: "deactivated", via: "activate", to: "active" },
        { from: "deactivated", via: "uninstall", to: "uninstalled" },
      ]),
    );
  });

  it("nextInstallationState returns the destination for legal moves", () => {
    expect(nextInstallationState("installed", "activate")).toBe("active");
    expect(nextInstallationState("active", "deactivate")).toBe("deactivated");
    expect(nextInstallationState("deactivated", "activate")).toBe("active");
    expect(nextInstallationState("deactivated", "uninstall")).toBe("uninstalled");
  });

  it.each<[InstallationState, InstallationTransition]>([
    ["installed", "deactivate"],
    ["uninstalled", "activate"],
    ["uninstalled", "deactivate"],
    ["uninstalled", "uninstall"],
    ["active", "activate"],
  ])("rejects %s -> %s with IllegalInstallationTransitionError", (from, via) => {
    expect(() => nextInstallationState(from, via)).toThrow(IllegalInstallationTransitionError);
  });

  it("can* helpers correctly gate UI buttons", () => {
    expect(canActivate("installed")).toBe(true);
    expect(canActivate("active")).toBe(false);
    expect(canDeactivate("active")).toBe(true);
    expect(canDeactivate("installed")).toBe(false);
    expect(canUninstall("installed")).toBe(true);
    expect(canUninstall("uninstalled")).toBe(false);
  });

  it("isInstallationTerminal flags only uninstalled", () => {
    expect(isInstallationTerminal("uninstalled")).toBe(true);
    expect(isInstallationTerminal("installed")).toBe(false);
    expect(isInstallationTerminal("active")).toBe(false);
    expect(isInstallationTerminal("deactivated")).toBe(false);
  });

  it("labels + tones cover every state", () => {
    for (const state of ["installed", "active", "deactivated", "uninstalled"] as const) {
      expect(installationStateLabel(state).length).toBeGreaterThan(0);
      expect(["neutral", "ok", "warn", "danger"]).toContain(installationStateTone(state));
    }
  });

  it("isInstallationState narrows strings", () => {
    expect(isInstallationState("active")).toBe(true);
    expect(isInstallationState("ghost")).toBe(false);
  });

  it("isValidPluginSlug enforces kebab-case", () => {
    expect(isValidPluginSlug("stripe-payments")).toBe(true);
    expect(isValidPluginSlug("a")).toBe(false);
    expect(isValidPluginSlug("Stripe-Payments")).toBe(false);
    expect(isValidPluginSlug("-stripe")).toBe(false);
  });

  it("isValidSemver enforces strict X.Y.Z", () => {
    expect(isValidSemver("1.2.3")).toBe(true);
    expect(isValidSemver("1.2")).toBe(false);
    expect(isValidSemver("1.2.3-beta")).toBe(false);
  });
});
