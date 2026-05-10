// File scope: v3.9.1 Existing #10 onboarding-wizard parser tests.
import { describe, expect, it } from "vitest";
import { parseWizardState } from "./onboarding-wizard";

describe("parseWizardState", () => {
  it("parses a complete wizard state", () => {
    const state = parseWizardState({
      tenant_id: "tenant-1",
      wizard_id: "wiz-1",
      current_step: 4,
      completed_steps: [1, 2, 3],
      identity: {
        tenant_name: "Acme",
        owner_email: "ops@acme.example",
        country: "AU",
        business_type: "company",
      },
      channels: { channels: ["tiktok"] },
      compliance: { compliance: ["au_consumer_law"] },
      seeding: { source: "1688", item_count: 25 },
      completed: false,
      started_at: "2026-05-10T00:00:00Z",
    });
    expect(state).not.toBeNull();
    expect(state!.tenantId).toBe("tenant-1");
    expect(state!.identity?.tenantName).toBe("Acme");
    expect(state!.channels?.channels).toEqual(["tiktok"]);
  });

  it("returns null for invalid input", () => {
    expect(parseWizardState(null)).toBeNull();
    expect(parseWizardState({})).toBeNull();
    expect(parseWizardState({ tenant_id: "tenant-1" })).toBeNull();
  });

  it("ignores invalid identity sub-object", () => {
    const state = parseWizardState({
      tenant_id: "tenant-1",
      wizard_id: "wiz-1",
      current_step: 1,
      identity: { tenant_name: "" }, // missing required fields
    });
    expect(state?.identity).toBeUndefined();
  });

  it("ignores invalid channel sub-object", () => {
    const state = parseWizardState({
      tenant_id: "tenant-1",
      wizard_id: "wiz-1",
      current_step: 2,
      channels: { channels: [] },
    });
    expect(state?.channels).toBeUndefined();
  });

  it("ignores invalid compliance sub-object", () => {
    const state = parseWizardState({
      tenant_id: "tenant-1",
      wizard_id: "wiz-1",
      current_step: 3,
      compliance: { compliance: 123 },
    });
    expect(state?.compliance).toBeUndefined();
  });

  it("ignores invalid seeding sub-object", () => {
    const state = parseWizardState({
      tenant_id: "tenant-1",
      wizard_id: "wiz-1",
      current_step: 4,
      seeding: {},
    });
    expect(state?.seeding).toBeUndefined();
  });
});
