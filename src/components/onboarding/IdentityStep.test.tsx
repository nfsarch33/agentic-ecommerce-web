// File scope: v3.9.1 Existing #10 IdentityStep tests.
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { IdentityStep } from "./IdentityStep";

describe("IdentityStep", () => {
  it("submits the captured identity", () => {
    const onSubmit = vi.fn();
    render(<IdentityStep onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId("onboarding-identity-name"), { target: { value: "Acme" } });
    fireEvent.change(screen.getByTestId("onboarding-identity-email"), { target: { value: "ops@acme.example" } });
    fireEvent.change(screen.getByTestId("onboarding-identity-country"), { target: { value: "au" } });
    fireEvent.click(screen.getByTestId("onboarding-identity-submit"));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const arg = onSubmit.mock.calls[0]?.[0];
    expect(arg).toEqual({
      tenantName: "Acme",
      ownerEmail: "ops@acme.example",
      country: "AU",
      businessType: "company",
    });
  });

  it("disables the submit button until all fields are populated", () => {
    const onSubmit = vi.fn();
    render(<IdentityStep onSubmit={onSubmit} />);
    const button = screen.getByTestId("onboarding-identity-submit") as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it("renders initial values when initial prop is provided", () => {
    const onSubmit = vi.fn();
    render(
      <IdentityStep
        onSubmit={onSubmit}
        initial={{
          tenantName: "Acme",
          ownerEmail: "ops@acme.example",
          country: "AU",
          businessType: "company",
        }}
      />,
    );
    const nameInput = screen.getByTestId("onboarding-identity-name") as HTMLInputElement;
    expect(nameInput.value).toBe("Acme");
  });
});
