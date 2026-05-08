import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TenantWizardSteps } from "./TenantWizardSteps";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

afterEach(() => {
  vi.restoreAllMocks();
  pushMock.mockReset();
});

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json" } });
}

describe("TenantWizardSteps", () => {
  it("disables Next when slug is invalid", async () => {
    const user = userEvent.setup();
    render(<TenantWizardSteps baseUrl="http://x" />);
    await user.type(screen.getByTestId("tenant-wizard-slug"), "BAD");
    await user.type(screen.getByTestId("tenant-wizard-name"), "Acme");
    expect(screen.getByTestId("tenant-wizard-slug-error")).toBeInTheDocument();
    expect(screen.getByTestId("tenant-wizard-next")).toBeDisabled();
  });

  it("walks the three-step wizard end-to-end", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(
        {
          id: "acme",
          slug: "acme",
          name: "Acme",
          plan: "free",
          status: "provisioning",
          created_at: "2026-05-08T10:00:00Z",
          updated_at: "2026-05-08T10:00:00Z",
        },
        201,
      ),
    );
    const user = userEvent.setup();
    render(<TenantWizardSteps baseUrl="http://x" />);
    await user.type(screen.getByTestId("tenant-wizard-slug"), "acme");
    await user.type(screen.getByTestId("tenant-wizard-name"), "Acme");
    await user.selectOptions(screen.getByTestId("tenant-wizard-plan"), "pro");
    await user.click(screen.getByTestId("tenant-wizard-next"));
    expect(screen.getByTestId("tenant-wizard-preview-slug")).toHaveTextContent("acme");
    expect(screen.getByTestId("tenant-wizard-preview-plan")).toHaveTextContent("pro");
    await act(async () => {
      await user.click(screen.getByTestId("tenant-wizard-submit"));
    });
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/admin/tenants/acme"));
  });

  it("surfaces backend errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("nope", { status: 409 }));
    const user = userEvent.setup();
    render(<TenantWizardSteps baseUrl="http://x" />);
    await user.type(screen.getByTestId("tenant-wizard-slug"), "acme");
    await user.type(screen.getByTestId("tenant-wizard-name"), "Acme");
    await user.click(screen.getByTestId("tenant-wizard-next"));
    await act(async () => {
      await user.click(screen.getByTestId("tenant-wizard-submit"));
    });
    await waitFor(() => expect(screen.getByTestId("tenant-wizard-error")).toBeInTheDocument());
  });
});
