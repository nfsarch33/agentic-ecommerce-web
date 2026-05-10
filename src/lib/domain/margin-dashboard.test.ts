import { describe, expect, it } from "vitest";
import {
  alertSeverityToneClass,
  formatAUDCents,
  formatPct,
  parseMarginAlerts,
  parseMarginEnvelope,
  parseMarginForecast,
} from "./margin-dashboard";

describe("formatAUDCents", () => {
  it("renders integer cents as currency", () => {
    expect(formatAUDCents(150_00)).toMatch(/\$150\.00/);
    expect(formatAUDCents(0)).toMatch(/\$0\.00/);
  });

  it("falls back on non-finite input", () => {
    expect(formatAUDCents(Number.NaN)).toBe("$0.00");
    expect(formatAUDCents(Number.POSITIVE_INFINITY)).toBe("$0.00");
  });
});

describe("formatPct", () => {
  it("renders ratio as percentage", () => {
    expect(formatPct(0.532)).toBe("53.2%");
    expect(formatPct(0)).toBe("0.0%");
  });

  it("falls back on non-finite input", () => {
    expect(formatPct(Number.NaN)).toBe("0.0%");
  });
});

describe("alertSeverityToneClass", () => {
  it("maps critical to red", () => {
    expect(alertSeverityToneClass("critical")).toContain("red");
  });

  it("maps warning to amber", () => {
    expect(alertSeverityToneClass("warning")).toContain("amber");
  });

  it("maps info to blue", () => {
    expect(alertSeverityToneClass("info")).toContain("blue");
  });

  it("maps unknown to gray", () => {
    expect(alertSeverityToneClass("unknown")).toContain("gray");
  });
});

describe("parseMarginEnvelope", () => {
  it("decodes a canonical envelope", () => {
    const result = parseMarginEnvelope({
      tenant_id: "tenant-1",
      from: "2026-04-10T00:00:00Z",
      to: "2026-05-10T00:00:00Z",
      channel: "tiktok",
      dashboard: {
        revenue_aud_cents: 150_00_00,
        supplier_cost_aud_cents: 60_00_00,
        shipping_cost_aud_cents: 10_00_00,
        net_margin_aud_cents: 80_00_00,
        net_margin_pct: 0.5333,
        roi_pct: 1.0,
        order_count: 120,
        competitor_avg_aud_cents: 14_50_00,
        competitor_positioning: "above",
      },
    });
    expect(result?.tenantId).toBe("tenant-1");
    expect(result?.dashboard.revenueAUDCents).toBe(150_00_00);
    expect(result?.dashboard.competitorPositioning).toBe("above");
  });

  it("returns undefined for malformed input", () => {
    expect(parseMarginEnvelope(null)).toBeUndefined();
    expect(parseMarginEnvelope("string")).toBeUndefined();
    expect(parseMarginEnvelope({ dashboard: "not-an-object" })).toBeUndefined();
  });

  it("normalises unknown competitor positioning", () => {
    const result = parseMarginEnvelope({ dashboard: { competitor_positioning: "weird" } });
    expect(result?.dashboard.competitorPositioning).toBe("unknown");
  });

  it("handles string-encoded numbers", () => {
    const result = parseMarginEnvelope({
      dashboard: { revenue_aud_cents: "1500", net_margin_pct: "0.42" },
    });
    expect(result?.dashboard.revenueAUDCents).toBe(1500);
    expect(result?.dashboard.netMarginPct).toBe(0.42);
  });
});

describe("parseMarginAlerts", () => {
  it("decodes the canonical alerts envelope", () => {
    const result = parseMarginAlerts({
      alerts: [
        { product_id: "sku-1", severity: "warning", reason: "near_floor", delta_pct: -0.04 },
        { product_id: "sku-2", severity: "critical", reason: "competitor_undercut", delta_pct: -0.10 },
      ],
    });
    expect(result).toHaveLength(2);
    expect(result[0]!.severity).toBe("warning");
    expect(result[1]!.severity).toBe("critical");
  });

  it("returns empty array on malformed input", () => {
    expect(parseMarginAlerts(null)).toEqual([]);
    expect(parseMarginAlerts({ alerts: "not-an-array" })).toEqual([]);
  });

  it("ignores non-record alert entries", () => {
    const result = parseMarginAlerts({ alerts: [null, "string", { product_id: "sku-1", severity: "info" }] });
    expect(result).toHaveLength(1);
    const first = result[0];
    expect(first).toBeDefined();
    expect(first!.productId).toBe("sku-1");
    expect(first!.severity).toBe("info");
  });
});

describe("parseMarginForecast", () => {
  it("decodes the forecast envelope", () => {
    const result = parseMarginForecast({
      forecast_aud_cents: 200_00_00,
      lower_bound_aud_cents: 180_00_00,
      upper_bound_aud_cents: 220_00_00,
      confidence_pct: 0.85,
      based_on_days: 30,
    });
    expect(result).toBeDefined();
    expect(result!.forecastAUDCents).toBe(200_00_00);
    expect(result!.confidencePct).toBe(0.85);
  });

  it("returns undefined on malformed input", () => {
    expect(parseMarginForecast(null)).toBeUndefined();
  });

  it("falls back fields to 0", () => {
    const result = parseMarginForecast({});
    expect(result).toBeDefined();
    expect(result!.forecastAUDCents).toBe(0);
  });
});
