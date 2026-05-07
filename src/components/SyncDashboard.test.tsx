import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SyncDashboard } from "./SyncDashboard";
import type { SyncConflict, SyncStatus } from "@/lib/domain/sync";

const status: SyncStatus = {
  totalEvents: 5,
  pendingConflicts: 1,
  lastEvent: {
    id: "event_1",
    type: "conflict_detected",
    productId: "p_1",
    remoteId: 44,
    createdAt: "2026-05-07T04:30:00Z",
  },
  updatedAt: "2026-05-07T04:31:00Z",
};

const conflict: SyncConflict = {
  id: "conflict_1",
  productId: "p_1",
  sku: "SKU-1",
  remoteId: 44,
  fields: [{ field: "price", localValue: "3500", remoteValue: "3999" }],
  status: "pending",
  createdAt: "2026-05-07T04:26:00Z",
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
    expect(screen.getByText("conflict_detected")).toBeInTheDocument();
    expect(screen.getByText("price")).toBeInTheDocument();
    expect(screen.getByText(/product sku-1/i)).toBeInTheDocument();
    expect(screen.getByText(/local value/i)).toBeInTheDocument();
    expect(screen.getByText(/woocommerce value/i)).toBeInTheDocument();
    expect(screen.getByText("3500")).toBeInTheDocument();
    expect(screen.getByText("3999")).toBeInTheDocument();
  });

  it("invokes local, remote, and manual resolution controls", async () => {
    const user = userEvent.setup();
    const resolveConflictImpl = vi.fn().mockResolvedValue({
      ...conflict,
      status: "resolved",
      resolution: "local",
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

    await user.click(screen.getByRole("button", { name: /use local/i }));
    expect(resolveConflictImpl).toHaveBeenLastCalledWith(
      expect.objectContaining({ conflictId: "conflict_1", resolution: "local" }),
    );

    await user.click(screen.getByRole("button", { name: /use woocommerce/i }));
    expect(resolveConflictImpl).toHaveBeenLastCalledWith(
      expect.objectContaining({ conflictId: "conflict_1", resolution: "remote" }),
    );

    await user.click(screen.getByRole("button", { name: /mark manual/i }));
    expect(resolveConflictImpl).toHaveBeenLastCalledWith(
      expect.objectContaining({ conflictId: "conflict_1", resolution: "manual" }),
    );
  });
});
