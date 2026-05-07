import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SyncDashboard } from "./SyncDashboard";
import type { SyncConflict, SyncStatus } from "@/lib/domain/sync";

const status: SyncStatus = {
  state: "degraded",
  lastSyncAt: "2026-05-07T04:30:00Z",
  nextSyncAt: "2026-05-07T04:35:00Z",
  syncLagSeconds: 42,
  inFlightJobs: 1,
  queuedEvents: 5,
  conflictCount: 1,
  errorCount: 0,
  updatedAt: "2026-05-07T04:31:00Z",
};

const conflict: SyncConflict = {
  id: "conflict_1",
  resourceType: "product",
  resourceId: "p_1",
  field: "price.amount",
  backendValue: 3500,
  wooCommerceValue: 3999,
  localUpdatedAt: "2026-05-07T04:20:00Z",
  remoteUpdatedAt: "2026-05-07T04:25:00Z",
  detectedAt: "2026-05-07T04:26:00Z",
  status: "open",
};

describe("SyncDashboard", () => {
  it("renders status metrics and conflict values side by side", () => {
    render(
      <SyncDashboard
        apiBaseUrl="http://api.test"
        initialStatus={status}
        initialConflicts={[conflict]}
        resolveConflictImpl={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: /sync dashboard/i })).toBeInTheDocument();
    expect(screen.getByText("degraded")).toBeInTheDocument();
    expect(screen.getByText("42s")).toBeInTheDocument();
    expect(screen.getByText("price.amount")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /backend value/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /woocommerce value/i })).toBeInTheDocument();
    expect(screen.getByText("3500")).toBeInTheDocument();
    expect(screen.getByText("3999")).toBeInTheDocument();
  });

  it("invokes accept local, accept remote, and mark resolved controls", async () => {
    const user = userEvent.setup();
    const resolveConflictImpl = vi.fn().mockResolvedValue({
      ...conflict,
      status: "resolved",
      resolution: "accept_local",
      resolvedAt: "2026-05-07T04:45:00Z",
    });

    render(
      <SyncDashboard
        apiBaseUrl="http://api.test"
        initialStatus={status}
        initialConflicts={[conflict]}
        resolveConflictImpl={resolveConflictImpl}
      />,
    );

    await user.click(screen.getByRole("button", { name: /accept backend/i }));
    expect(resolveConflictImpl).toHaveBeenLastCalledWith(
      expect.objectContaining({ conflictId: "conflict_1", resolution: "accept_local" }),
    );

    await user.click(screen.getByRole("button", { name: /accept woocommerce/i }));
    expect(resolveConflictImpl).toHaveBeenLastCalledWith(
      expect.objectContaining({ conflictId: "conflict_1", resolution: "accept_remote" }),
    );

    await user.click(screen.getByRole("button", { name: /mark resolved/i }));
    expect(resolveConflictImpl).toHaveBeenLastCalledWith(
      expect.objectContaining({ conflictId: "conflict_1", resolution: "mark_resolved" }),
    );
  });
});
