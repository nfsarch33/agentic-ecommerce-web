import { describe, expect, it } from "vitest";
import {
  IllegalLicenseTransitionError,
  allLegalLicenseTransitions,
  canRevoke,
  isLicenseState,
  isLicenseTerminal,
  isLicenseUsable,
  isProductType,
  licenseStateLabel,
  licenseStateTone,
  nextLicenseState,
  type LicenseState,
  type LicenseTransition,
} from "./digital";

describe("digital licence state machine", () => {
  it("encodes the same triples as the backend", () => {
    expect(allLegalLicenseTransitions()).toEqual([
      { from: "active", via: "revoke", to: "revoked" },
      { from: "active", via: "expire", to: "expired" },
    ]);
  });

  it("nextLicenseState returns the destination for legal moves", () => {
    expect(nextLicenseState("active", "revoke")).toBe("revoked");
    expect(nextLicenseState("active", "expire")).toBe("expired");
  });

  it.each<[LicenseState, LicenseTransition]>([
    ["revoked", "revoke"],
    ["revoked", "expire"],
    ["expired", "revoke"],
    ["expired", "expire"],
  ])("rejects %s -> %s with IllegalLicenseTransitionError", (from, via) => {
    expect(() => nextLicenseState(from, via)).toThrow(IllegalLicenseTransitionError);
  });

  it("isLicenseTerminal flags only revoked/expired", () => {
    expect(isLicenseTerminal("active")).toBe(false);
    expect(isLicenseTerminal("revoked")).toBe(true);
    expect(isLicenseTerminal("expired")).toBe(true);
  });

  it("canRevoke is true only for active", () => {
    expect(canRevoke("active")).toBe(true);
    expect(canRevoke("revoked")).toBe(false);
    expect(canRevoke("expired")).toBe(false);
  });

  it("isLicenseUsable mirrors backend CheckActive", () => {
    expect(isLicenseUsable("active")).toBe(true);
    expect(isLicenseUsable("revoked")).toBe(false);
    expect(isLicenseUsable("expired")).toBe(false);
  });

  it("license labels and tones cover every state", () => {
    expect(licenseStateLabel("active")).toBe("Active");
    expect(licenseStateLabel("revoked")).toBe("Revoked");
    expect(licenseStateLabel("expired")).toBe("Expired");
    expect(licenseStateTone("active")).toBe("ok");
    expect(licenseStateTone("expired")).toBe("warn");
    expect(licenseStateTone("revoked")).toBe("danger");
  });

  it("isLicenseState type guard accepts canonical values", () => {
    expect(isLicenseState("active")).toBe(true);
    expect(isLicenseState("revoked")).toBe(true);
    expect(isLicenseState("expired")).toBe(true);
    expect(isLicenseState("rogue")).toBe(false);
  });

  it("isProductType type guard accepts canonical values", () => {
    expect(isProductType("physical")).toBe(true);
    expect(isProductType("digital")).toBe(true);
    expect(isProductType("membership")).toBe(true);
    expect(isProductType("subscription")).toBe(false);
  });
});
