// File scope: v3.9.1 EC-9-5 operator-alerts parser tests.
import { describe, expect, it } from "vitest";
import {
  alertSeverityToneClass,
  alertTypeLabel,
  parseAlertList,
} from "./operator-alerts";

describe("parseAlertList", () => {
  it("parses a list of alerts", () => {
    const alerts = parseAlertList({
      alerts: [
        {
          tenant_id: "tenant-1",
          alert_id: "alert-1",
          alert_type: "large_refund_pending_approval",
          severity: "critical",
          status: "pending",
          created_at: "2026-05-10T00:00:00Z",
          expires_at: "2026-05-11T00:00:00Z",
        },
      ],
    });
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.severity).toBe("critical");
    expect(alerts[0]?.alertType).toBe("large_refund_pending_approval");
  });

  it("filters out invalid alert types", () => {
    const alerts = parseAlertList({
      alerts: [{ alert_type: "unknown_alert_type", status: "pending", severity: "info" }],
    });
    expect(alerts).toHaveLength(0);
  });

  it("filters out invalid status", () => {
    const alerts = parseAlertList({
      alerts: [
        {
          alert_type: "captcha_detected",
          status: "frozen",
          severity: "info",
        },
      ],
    });
    expect(alerts).toHaveLength(0);
  });

  it("returns empty array for malformed input", () => {
    expect(parseAlertList(null)).toEqual([]);
    expect(parseAlertList({ alerts: "not-an-array" })).toEqual([]);
    expect(parseAlertList({})).toEqual([]);
  });

  it("defaults to warning severity when severity is unknown", () => {
    const alerts = parseAlertList({
      alerts: [
        {
          alert_type: "captcha_detected",
          status: "pending",
          severity: "wat",
          tenant_id: "t",
          alert_id: "a",
          created_at: "2026-05-10T00:00:00Z",
          expires_at: "2026-05-11T00:00:00Z",
        },
      ],
    });
    expect(alerts[0]?.severity).toBe("warning");
  });
});

describe("alertSeverityToneClass", () => {
  it("maps each severity to a tailwind class", () => {
    expect(alertSeverityToneClass("info")).toContain("sky");
    expect(alertSeverityToneClass("warning")).toContain("amber");
    expect(alertSeverityToneClass("critical")).toContain("red");
  });
});

describe("alertTypeLabel", () => {
  it("renders human-readable labels for every alert type", () => {
    expect(alertTypeLabel("large_refund_pending_approval")).toMatch(/refund/i);
    expect(alertTypeLabel("large_dropship_pending_approval")).toMatch(/drop-ship/i);
    expect(alertTypeLabel("price_change_pending_approval")).toMatch(/price/i);
    expect(alertTypeLabel("captcha_detected")).toMatch(/CAPTCHA/);
    expect(alertTypeLabel("omniparser_unavailable")).toMatch(/OmniParser/);
    expect(alertTypeLabel("rate_limit_drain")).toMatch(/rate-limit/i);
    expect(alertTypeLabel("channel_status_update_failed")).toMatch(/channel/i);
    expect(alertTypeLabel("large_margin_alert")).toMatch(/margin/i);
  });
});
