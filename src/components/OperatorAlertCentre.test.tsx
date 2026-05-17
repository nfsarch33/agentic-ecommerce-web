import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OperatorAlertCentre } from "./OperatorAlertCentre";

function mkResp(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function operatorAlert(
  overrides: Partial<{
    tenant_id: string;
    alert_id: string;
    alert_type: string;
    severity: string;
    status: string;
    created_at: string;
    acknowledged_at: string;
    resolved_at: string;
    expires_at: string;
    action_taken: string;
  }> = {},
) {
  return {
    tenant_id: "tenant-1",
    alert_id: "pending-1",
    alert_type: "large_refund_pending_approval",
    severity: "critical",
    status: "pending",
    created_at: "2026-05-17T12:00:00Z",
    expires_at: "2026-05-18T12:00:00Z",
    ...overrides,
  };
}

describe("OperatorAlertCentre", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders summary cards and lets operators switch between pending, acknowledged, and resolved queues", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes("status=pending")) {
        return mkResp({
          tenant_id: "tenant-1",
          status: "pending",
          alerts: [
            operatorAlert({ alert_id: "pending-1" }),
            operatorAlert({ alert_id: "pending-2" }),
          ],
          count: 2,
        });
      }
      if (url.includes("status=acknowledged")) {
        return mkResp({
          tenant_id: "tenant-1",
          status: "acknowledged",
          alerts: [
            operatorAlert({
              alert_id: "ack-1",
              status: "acknowledged",
              acknowledged_at: "2026-05-17T12:10:00Z",
            }),
          ],
          count: 1,
        });
      }
      if (url.includes("status=resolved")) {
        return mkResp({
          tenant_id: "tenant-1",
          status: "resolved",
          alerts: [
            operatorAlert({
              alert_id: "resolved-1",
              status: "resolved",
              resolved_at: "2026-05-17T12:20:00Z",
              action_taken: "approve",
            }),
          ],
          count: 1,
        });
      }
      throw new Error(`unexpected request: ${url}`);
    });

    render(<OperatorAlertCentre fetchImpl={fetchImpl as typeof fetch} intervalMs={60_000} />);

    await waitFor(() => {
      expect(screen.getByTestId("operator-alert-summary-pending")).toHaveTextContent("2");
    });
    expect(screen.getByTestId("operator-alert-summary-acknowledged")).toHaveTextContent("1");
    expect(screen.getByTestId("operator-alert-summary-resolved")).toHaveTextContent("1");

    const user = userEvent.setup();
    await user.click(screen.getByTestId("operator-alert-queue-acknowledged"));

    expect(await screen.findByTestId("operator-alert-ack-1")).toBeInTheDocument();

    await user.click(screen.getByTestId("operator-alert-queue-resolved"));

    expect(await screen.findByTestId("operator-alert-resolved-1")).toBeInTheDocument();
  });

  it("keeps the backend mutation outcome visible with transition timestamps instead of dropping the alert", async () => {
    const fetchImpl = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        if (!init?.method || init.method === "GET") {
          if (url.includes("status=pending")) {
            return mkResp({
              tenant_id: "tenant-1",
              status: "pending",
              alerts: [operatorAlert({ alert_id: "pending-1" })],
              count: 1,
            });
          }
          if (url.includes("status=acknowledged")) {
            return mkResp({
              tenant_id: "tenant-1",
              status: "acknowledged",
              alerts: [],
              count: 0,
            });
          }
          if (url.includes("status=resolved")) {
            return mkResp({
              tenant_id: "tenant-1",
              status: "resolved",
              alerts: [],
              count: 0,
            });
          }
        }
        if (init?.method === "POST" && url.includes("/acknowledge")) {
          return mkResp({
            tenant_id: "tenant-1",
            alert_id: "pending-1",
            status: "acknowledged",
            acknowledged_at: "2026-05-17T12:34:56Z",
          });
        }
        throw new Error(`unexpected request: ${url}`);
      },
    );

    render(<OperatorAlertCentre fetchImpl={fetchImpl as typeof fetch} intervalMs={60_000} />);

    const user = userEvent.setup();
    expect(await screen.findByTestId("operator-alert-pending-1")).toBeInTheDocument();

    await user.click(screen.getByTestId("operator-alert-ack-pending-1"));

    await waitFor(() => {
      expect(screen.getByTestId("operator-alert-summary-acknowledged")).toHaveTextContent("1");
    });
    expect(screen.getByTestId("operator-alert-queue-active")).toHaveTextContent("acknowledged");
    expect(screen.getByTestId("operator-alert-pending-1")).toBeInTheDocument();
    expect(screen.getByText("2026-05-17T12:34:56Z")).toBeInTheDocument();
  });

  it("hides resolve actions for pending alerts until they are acknowledged", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes("status=pending")) {
        return mkResp({
          tenant_id: "tenant-1",
          status: "pending",
          alerts: [operatorAlert({ alert_id: "pending-1" })],
          count: 1,
        });
      }
      if (url.includes("status=acknowledged")) {
        return mkResp({
          tenant_id: "tenant-1",
          status: "acknowledged",
          alerts: [],
          count: 0,
        });
      }
      if (url.includes("status=resolved")) {
        return mkResp({
          tenant_id: "tenant-1",
          status: "resolved",
          alerts: [],
          count: 0,
        });
      }
      throw new Error(`unexpected request: ${url}`);
    });

    render(<OperatorAlertCentre fetchImpl={fetchImpl as typeof fetch} intervalMs={60_000} />);

    expect(await screen.findByTestId("operator-alert-pending-1")).toBeInTheDocument();
    expect(screen.queryByTestId("operator-alert-approve-pending-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("operator-alert-deny-pending-1")).not.toBeInTheDocument();
  });

  it("preserves the last known queue state when a later poll fails", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes("status=pending")) {
        const pendingCalls =
          fetchImpl.mock.calls.filter(([callInput]) => {
            const callUrl =
              typeof callInput === "string"
                ? callInput
                : callInput instanceof URL
                  ? callInput.toString()
                  : callInput.url;
            return callUrl.includes("status=pending");
          }).length ?? 0;
        if (pendingCalls === 1) {
          return mkResp({
            tenant_id: "tenant-1",
            status: "pending",
            alerts: [operatorAlert({ alert_id: "pending-1" })],
            count: 1,
          });
        }
        throw new Error("poll failed");
      }
      if (url.includes("status=acknowledged")) {
        return mkResp({
          tenant_id: "tenant-1",
          status: "acknowledged",
          alerts: [],
          count: 0,
        });
      }
      if (url.includes("status=resolved")) {
        return mkResp({
          tenant_id: "tenant-1",
          status: "resolved",
          alerts: [],
          count: 0,
        });
      }
      throw new Error(`unexpected request: ${url}`);
    });

    render(<OperatorAlertCentre fetchImpl={fetchImpl as typeof fetch} intervalMs={1} />);

    await waitFor(() => {
      expect(screen.getByTestId("operator-alert-summary-pending")).toHaveTextContent("1");
    });
    expect(screen.getByTestId("operator-alert-pending-1")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("operator-alerts-error")).toBeInTheDocument();
    });

    expect(screen.getByTestId("operator-alert-summary-pending")).toHaveTextContent("1");
    expect(screen.getByTestId("operator-alert-pending-1")).toBeInTheDocument();
    expect(screen.getByText(/Failed to update operator alert|Failed to load operator alerts/)).toBeInTheDocument();
  });
});
