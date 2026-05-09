import { describe, expect, it } from "vitest";
import {
  agentActivityKey,
  agentActivityToneClass,
  formatActivityTimestamp,
  parseAgentActivity,
} from "./agent-activity";

describe("agent-activity domain", () => {
  it("maps every status to a tone class", () => {
    const cases = [
      ["applied", "bg-green"],
      ["ok", "bg-green"],
      ["placed", "bg-green"],
      ["replied", "bg-green"],
      ["pending_approval", "bg-blue"],
      ["received", "bg-blue"],
      ["rolled_back", "bg-red"],
      ["escalated", "bg-red"],
      ["dropped", "bg-red"],
      ["changed", "bg-amber"],
      ["unknown", "bg-gray"],
    ] as const;
    for (const [status, prefix] of cases) {
      expect(agentActivityToneClass(status)).toContain(prefix);
    }
  });

  it("computes a stable key from the activity id", () => {
    const got = agentActivityKey({
      id: "x-1",
      tenantId: "t",
      agentId: "a",
      action: "act",
      status: "ok",
      timestamp: "2026-05-10T12:00:00Z",
    });
    expect(got).toBe("x-1");
  });

  it("formats valid timestamps and falls back for invalid ones", () => {
    const got = formatActivityTimestamp("2026-05-10T12:00:00Z");
    expect(got).not.toBe("");
    expect(got).not.toBe("2026-05-10T12:00:00Z"); // it was reformatted
    expect(formatActivityTimestamp("not-a-date")).toBe("not-a-date");
  });

  it("parses a well-formed envelope", () => {
    const got = parseAgentActivity(
      JSON.stringify({
        tenant_id: "tenant-a",
        agent_id: "pricing_agent",
        action: "price.change.applied",
        status: "applied",
        timestamp: "2026-05-10T12:00:00Z",
        details: { product_id: "p1" },
      }),
      "id-1",
    );
    expect(got?.tenantId).toBe("tenant-a");
    expect(got?.action).toBe("price.change.applied");
    expect(got?.status).toBe("applied");
    expect(got?.details?.product_id).toBe("p1");
  });

  it("falls back to defaults for missing fields", () => {
    const got = parseAgentActivity(JSON.stringify({ tenant_id: "t" }), "id-2");
    expect(got?.agentId).toBe("unknown");
    expect(got?.action).toBe("unknown");
    expect(got?.status).toBe("unknown");
  });

  it("returns undefined for malformed payloads", () => {
    expect(parseAgentActivity("not json", "id-3")).toBeUndefined();
    expect(parseAgentActivity(JSON.stringify({ no_tenant: true }), "id-4")).toBeUndefined();
  });

  it("normalises unknown statuses to 'unknown'", () => {
    const got = parseAgentActivity(
      JSON.stringify({ tenant_id: "t", status: "wat" }),
      "id-5",
    );
    expect(got?.status).toBe("unknown");
  });
});
