// File scope: v3.9.1 Existing #10 OnboardingWizard component tests.
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { OnboardingWizard } from "./OnboardingWizard";

function ok(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("OnboardingWizard", () => {
  it("renders the loading state on first render", () => {
    const fetchImpl = vi.fn(() => new Promise<Response>(() => {}));
    render(<OnboardingWizard fetchImpl={fetchImpl as unknown as typeof fetch} />);
    expect(screen.getByTestId("onboarding-loading")).toBeInTheDocument();
  });

  it("renders an error state if the start endpoint fails", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 500 }));
    render(<OnboardingWizard fetchImpl={fetchImpl as unknown as typeof fetch} />);
    await waitFor(() => {
      expect(screen.getByTestId("onboarding-error")).toBeInTheDocument();
    });
  });

  it("walks through step 1 then renders step 2", async () => {
    const fetchImpl = vi
      .fn<(url: string, init?: RequestInit) => Promise<Response>>()
      .mockImplementationOnce(async () =>
        ok({ tenant_id: "tenant-1", wizard_id: "wiz-1", current_step: 1 }),
      )
      .mockImplementationOnce(async () =>
        ok({
          tenant_id: "tenant-1",
          wizard_id: "wiz-1",
          current_step: 2,
          completed_steps: [1],
          identity: {
            tenant_name: "Acme",
            owner_email: "ops@acme.example",
            country: "AU",
            business_type: "company",
          },
        }),
      );

    render(<OnboardingWizard fetchImpl={fetchImpl as unknown as typeof fetch} tenantId="tenant-1" />);

    await waitFor(() => {
      expect(screen.getByTestId("onboarding-step-identity")).toBeInTheDocument();
    });
    fireEvent.change(screen.getByTestId("onboarding-identity-name"), { target: { value: "Acme" } });
    fireEvent.change(screen.getByTestId("onboarding-identity-email"), { target: { value: "ops@acme.example" } });
    fireEvent.change(screen.getByTestId("onboarding-identity-country"), { target: { value: "AU" } });
    fireEvent.click(screen.getByTestId("onboarding-identity-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("onboarding-step-channels")).toBeInTheDocument();
    });
  });

  it("falls into error phase when a step submission fails", async () => {
    const fetchImpl = vi
      .fn<(url: string, init?: RequestInit) => Promise<Response>>()
      .mockImplementationOnce(async () =>
        ok({ tenant_id: "tenant-1", wizard_id: "wiz-1", current_step: 1 }),
      )
      .mockImplementationOnce(async () => new Response("err", { status: 400 }));

    render(<OnboardingWizard fetchImpl={fetchImpl as unknown as typeof fetch} tenantId="tenant-1" />);

    await waitFor(() => {
      expect(screen.getByTestId("onboarding-step-identity")).toBeInTheDocument();
    });
    fireEvent.change(screen.getByTestId("onboarding-identity-name"), { target: { value: "Acme" } });
    fireEvent.change(screen.getByTestId("onboarding-identity-email"), { target: { value: "ops@acme.example" } });
    fireEvent.change(screen.getByTestId("onboarding-identity-country"), { target: { value: "AU" } });
    fireEvent.click(screen.getByTestId("onboarding-identity-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("onboarding-error")).toBeInTheDocument();
    });
  });
});
