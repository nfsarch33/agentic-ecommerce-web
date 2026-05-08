import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TenantManagement } from "./TenantManagement";
import type { Tenant } from "@/lib/domain/tenant";

const baseTenant: Tenant = {
  id: "acme",
  slug: "acme",
  name: "Acme",
  plan: "free",
  status: "provisioning",
  createdAt: "2026-05-08T10:00:00Z",
  updatedAt: "2026-05-08T10:00:00Z",
};

afterEach(() => {
  vi.restoreAllMocks();
});

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json" } });
}

describe("TenantManagement", () => {
  it("renders empty state with no tenants", () => {
    render(<TenantManagement tenants={[]} baseUrl="http://x" />);
    expect(screen.getByTestId("tenants-empty")).toBeInTheDocument();
  });

  it("renders a row per tenant with status pill", () => {
    render(<TenantManagement tenants={[baseTenant]} baseUrl="http://x" />);
    expect(screen.getByTestId("tenant-row-acme")).toBeInTheDocument();
    expect(screen.getByTestId("tenant-status-provisioning")).toBeInTheDocument();
  });

  it("activates -> shows active pill", async () => {
    // Wire format uses snake_case; the adapter normalises to camelCase.
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        id: "acme",
        slug: "acme",
        name: "Acme",
        plan: "free",
        status: "active",
        created_at: "2026-05-08T10:00:00Z",
        updated_at: "2026-05-08T10:00:00Z",
      }),
    );
    const user = userEvent.setup();
    render(<TenantManagement tenants={[baseTenant]} baseUrl="http://x" />);
    await act(async () => {
      await user.click(screen.getByTestId("tenant-action-activate-acme"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("tenant-status-active")).toBeInTheDocument();
    });
  });

  it("surfaces backend errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("nope", { status: 422 }));
    const user = userEvent.setup();
    render(<TenantManagement tenants={[{ ...baseTenant, status: "active" }]} baseUrl="http://x" />);
    await user.click(screen.getByTestId("tenant-action-suspend-acme"));
    await waitFor(() => expect(screen.getByTestId("tenants-error")).toBeInTheDocument());
  });

  it("hides actions that are illegal for the current state", () => {
    render(<TenantManagement tenants={[{ ...baseTenant, status: "archived" }]} baseUrl="http://x" />);
    expect(screen.queryByTestId("tenant-action-activate-acme")).not.toBeInTheDocument();
    expect(screen.queryByTestId("tenant-action-suspend-acme")).not.toBeInTheDocument();
    expect(screen.queryByTestId("tenant-action-archive-acme")).not.toBeInTheDocument();
  });
});
