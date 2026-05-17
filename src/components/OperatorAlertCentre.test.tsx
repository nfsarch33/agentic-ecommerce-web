// File scope: v3.9.1 EC-9-5 OperatorAlertCentre tests.
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { OperatorAlertCentre } from "./OperatorAlertCentre";

const SAMPLE_ALERTS = {
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
    {
      tenant_id: "tenant-1",
      alert_id: "alert-2",
      alert_type: "captcha_detected",
      severity: "warning",
      status: "pending",
      created_at: "2026-05-10T01:00:00Z",
      expires_at: "2026-05-11T01:00:00Z",
    },
  ],
  count: 2,
};

function ok(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("OperatorAlertCentre", () => {
  it("renders the loading state on first render", () => {
    const fetchImpl = vi.fn(() => new Promise<Response>(() => {}));
    render(<OperatorAlertCentre fetchImpl={fetchImpl as unknown as typeof fetch} />);
    expect(screen.getByTestId("operator-alerts-loading")).toBeInTheDocument();
  });

  it("renders the alert list on success", async () => {
    const fetchImpl = vi.fn(async () => ok(SAMPLE_ALERTS));
    render(<OperatorAlertCentre fetchImpl={fetchImpl as unknown as typeof fetch} />);
    await waitFor(() => {
      expect(screen.getByTestId("operator-alerts-list")).toBeInTheDocument();
    });
    expect(screen.getByTestId("operator-alert-alert-1")).toBeInTheDocument();
    expect(screen.getByTestId("operator-alert-alert-2")).toBeInTheDocument();
    expect(screen.getByText(/Large refund pending approval/)).toBeInTheDocument();
    expect(screen.getByText(/CAPTCHA detected/)).toBeInTheDocument();
  });

  it("renders the empty state when there are no alerts", async () => {
    const fetchImpl = vi.fn(async () => ok({ alerts: [], count: 0 }));
    render(<OperatorAlertCentre fetchImpl={fetchImpl as unknown as typeof fetch} />);
    await waitFor(() => {
      expect(screen.getByTestId("operator-alerts-empty")).toBeInTheDocument();
    });
  });

  it("renders the error state on a non-2xx response", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 500 }));
    render(<OperatorAlertCentre fetchImpl={fetchImpl as unknown as typeof fetch} />);
    await waitFor(() => {
      expect(screen.getByTestId("operator-alerts-error")).toBeInTheDocument();
    });
  });

  it("posts to the acknowledge endpoint when the button is clicked", async () => {
    const calls: string[] = [];
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push(`${init?.method ?? "GET"} ${url}`);
      if (url.includes("/acknowledge")) {
        return ok({ status: "acknowledged" });
      }
      return ok(SAMPLE_ALERTS);
    });
    render(<OperatorAlertCentre fetchImpl={fetchImpl as unknown as typeof fetch} />);
    await waitFor(() => {
      expect(screen.getByTestId("operator-alert-alert-1")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("operator-alert-ack-alert-1"));
    await waitFor(() => {
      expect(calls.some((c) => c.includes("/acknowledge"))).toBe(true);
    });
  });

  it("posts to the resolve endpoint with the deny action", async () => {
    const calls: string[] = [];
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push(`${init?.method ?? "GET"} ${url}`);
      if (url.includes("/resolve")) {
        return ok({ status: "resolved" });
      }
      return ok(SAMPLE_ALERTS);
    });
    render(<OperatorAlertCentre fetchImpl={fetchImpl as unknown as typeof fetch} />);
    await waitFor(() => {
      expect(screen.getByTestId("operator-alert-alert-1")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("operator-alert-deny-alert-1"));
    await waitFor(() => {
      expect(calls.some((c) => c.includes("action=deny"))).toBe(true);
    });
  });

  it("surfaces acknowledge failures to the operator instead of silently swallowing them", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/acknowledge")) {
        return new Response(JSON.stringify({ error: "already_resolved" }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        });
      }
      return ok(SAMPLE_ALERTS);
    });
    render(<OperatorAlertCentre fetchImpl={fetchImpl as unknown as typeof fetch} />);
    await waitFor(() => {
      expect(screen.getByTestId("operator-alert-alert-1")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("operator-alert-ack-alert-1"));
    await waitFor(() => {
      expect(screen.getByTestId("operator-alerts-error")).toBeInTheDocument();
    });
    expect(screen.getByText(/HTTP 409/i)).toBeInTheDocument();
  });
});
