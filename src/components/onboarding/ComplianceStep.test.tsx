// File scope: v3.9.1 Existing #10 ComplianceStep tests.
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ComplianceStep } from "./ComplianceStep";

describe("ComplianceStep", () => {
  it("auto-detects AU compliance flags from country", () => {
    const onSubmit = vi.fn();
    render(
      <ComplianceStep
        onSubmit={onSubmit}
        identity={{
          tenantName: "Acme",
          ownerEmail: "ops@acme.example",
          country: "AU",
          businessType: "company",
        }}
      />,
    );
    const auCheckbox = screen.getByTestId("onboarding-compliance-au_consumer_law") as HTMLInputElement;
    expect(auCheckbox.checked).toBe(true);
  });

  it("auto-detects CN compliance flags from country", () => {
    const onSubmit = vi.fn();
    render(
      <ComplianceStep
        onSubmit={onSubmit}
        identity={{
          tenantName: "Acme",
          ownerEmail: "ops@acme.example",
          country: "CN",
          businessType: "company",
        }}
      />,
    );
    const cnCheckbox = screen.getByTestId("onboarding-compliance-cn_ecommerce_law") as HTMLInputElement;
    expect(cnCheckbox.checked).toBe(true);
  });

  it("submits the operator-selected flags", () => {
    const onSubmit = vi.fn();
    render(
      <ComplianceStep
        onSubmit={onSubmit}
        identity={{
          tenantName: "Acme",
          ownerEmail: "ops@acme.example",
          country: "AU",
          businessType: "company",
        }}
      />,
    );
    fireEvent.click(screen.getByTestId("onboarding-compliance-gdpr"));
    fireEvent.click(screen.getByTestId("onboarding-compliance-submit"));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("disables submit when no flags selected", () => {
    const onSubmit = vi.fn();
    render(<ComplianceStep onSubmit={onSubmit} />);
    const button = screen.getByTestId("onboarding-compliance-submit") as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it("uses initial.compliance when provided", () => {
    const onSubmit = vi.fn();
    render(
      <ComplianceStep
        onSubmit={onSubmit}
        initial={{ compliance: ["gdpr"] }}
        identity={{
          tenantName: "Acme",
          ownerEmail: "ops@acme.example",
          country: "AU",
          businessType: "company",
        }}
      />,
    );
    const gdpr = screen.getByTestId("onboarding-compliance-gdpr") as HTMLInputElement;
    expect(gdpr.checked).toBe(true);
    const au = screen.getByTestId("onboarding-compliance-au_consumer_law") as HTMLInputElement;
    expect(au.checked).toBe(false);
  });
});
