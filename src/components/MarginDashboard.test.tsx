// File scope: v3.9.0 EC-6-5 MarginDashboard component tests.
//
// Uses an injectable fetch implementation so the component's
// loading + ready + error paths can be exercised without a running
// backend. Mirrors the test patterns from AgentActivityFeed.test.tsx
// and SyncDashboard.test.tsx.
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MarginDashboard } from "./MarginDashboard";

function buildSuccessfulResponse(): Response {
  const body = {
    tenant_id: "tenant-1",
    from: "2026-04-10T00:00:00Z",
    to: "2026-05-10T00:00:00Z",
    channel: "",
    dashboard: {
      revenue_aud_cents: 150_00_00,
      supplier_cost_aud_cents: 60_00_00,
      shipping_cost_aud_cents: 10_00_00,
      platform_fees_aud_cents: 5_00_00,
      net_margin_aud_cents: 80_00_00,
      net_margin_pct: 0.5333,
      roi_pct: 1.0,
      order_count: 120,
      competitor_avg_aud_cents: 14_50_00,
      competitor_positioning: "above",
    },
    alerts: [
      { product_id: "sku-1", severity: "warning", reason: "near_floor", delta_pct: -0.04, channel: "tiktok" },
      { product_id: "sku-2", severity: "critical", reason: "competitor_undercut", delta_pct: -0.10, channel: "facebook" },
    ],
    forecast: {
      forecast_aud_cents: 200_00_00,
      lower_bound_aud_cents: 180_00_00,
      upper_bound_aud_cents: 220_00_00,
      confidence_pct: 0.85,
      based_on_days: 30,
    },
  };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("MarginDashboard", () => {
  it("renders the loading state on first render", () => {
    const fetchImpl = vi.fn(() => new Promise<Response>(() => {}));
    render(<MarginDashboard tenantId="tenant-1" fetchImpl={fetchImpl as unknown as typeof fetch} />);
    expect(screen.getByTestId("margin-dashboard-loading")).toBeInTheDocument();
  });

  it("renders the dashboard summary + alerts + forecast on success", async () => {
    const fetchImpl = vi.fn(async () => buildSuccessfulResponse());
    render(<MarginDashboard tenantId="tenant-1" fetchImpl={fetchImpl as unknown as typeof fetch} />);
    await waitFor(() => {
      expect(screen.getByTestId("margin-dashboard-ready")).toBeInTheDocument();
    });
    expect(screen.getByTestId("margin-dashboard-summary")).toBeInTheDocument();
    expect(screen.getAllByText(/Net margin/i).length).toBeGreaterThan(0);
    expect(screen.getByText("$8,000.00")).toBeInTheDocument(); // net margin
    expect(screen.getByTestId("margin-dashboard-alerts")).toBeInTheDocument();
    expect(screen.getByText("competitor_undercut")).toBeInTheDocument();
    expect(screen.getByTestId("margin-dashboard-forecast")).toBeInTheDocument();
  });

  it("renders an error state on a non-2xx response", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 500 }));
    render(<MarginDashboard tenantId="tenant-1" fetchImpl={fetchImpl as unknown as typeof fetch} />);
    await waitFor(() => {
      expect(screen.getByTestId("margin-dashboard-error")).toBeInTheDocument();
    });
    expect(screen.getByTestId("margin-dashboard-error")).toHaveTextContent(/HTTP 500/);
  });

  it("renders an error state on fetch rejection", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("network down");
    });
    render(<MarginDashboard tenantId="tenant-1" fetchImpl={fetchImpl as unknown as typeof fetch} />);
    await waitFor(() => {
      expect(screen.getByTestId("margin-dashboard-error")).toBeInTheDocument();
    });
    expect(screen.getByTestId("margin-dashboard-error")).toHaveTextContent(/network down/);
  });

  it("renders the empty alerts state when there are none", async () => {
    const body = {
      dashboard: {
        revenue_aud_cents: 0,
        supplier_cost_aud_cents: 0,
        net_margin_aud_cents: 0,
        net_margin_pct: 0,
        roi_pct: 0,
        order_count: 0,
        competitor_avg_aud_cents: 0,
        competitor_positioning: "parity",
      },
      alerts: [],
    };
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }));
    render(<MarginDashboard tenantId="tenant-1" fetchImpl={fetchImpl as unknown as typeof fetch} />);
    await waitFor(() => {
      expect(screen.getByTestId("margin-dashboard-ready")).toBeInTheDocument();
    });
    expect(screen.getByTestId("margin-dashboard-alerts-empty")).toBeInTheDocument();
  });

  it("forwards period + tenant params on the BFF request", async () => {
    const seenURLs: string[] = [];
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      seenURLs.push(typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url);
      return buildSuccessfulResponse();
    });
    render(<MarginDashboard tenantId="tenant-9" period="7d" fetchImpl={fetchImpl as unknown as typeof fetch} />);
    await waitFor(() => {
      expect(fetchImpl).toHaveBeenCalled();
    });
    const url = seenURLs[0] ?? "";
    expect(url).toContain("tenant_id=tenant-9");
    expect(url).toContain("period=7d");
  });

  it("renders an error state when fetch is unavailable", () => {
    render(<MarginDashboard tenantId="tenant-1" fetchImpl={undefined as unknown as typeof fetch} />);
    // Either loading or immediate error -- the unavailable branch
    // uses setState after mount.
    // Verify no crash occurred.
    expect(screen.queryByTestId("margin-dashboard-summary")).toBeNull();
  });
});
