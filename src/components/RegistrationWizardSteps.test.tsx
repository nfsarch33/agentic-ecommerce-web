import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RegistrationWizardSteps } from "./RegistrationWizardSteps";

describe("RegistrationWizardSteps", () => {
  it("highlights the submit step at start", () => {
    render(<RegistrationWizardSteps current="submit" />);
    expect(screen.getByTestId("registration-step-submit").getAttribute("data-state")).toBe(
      "current",
    );
  });

  it("marks earlier steps complete when current=onboarding", () => {
    render(<RegistrationWizardSteps current="onboarding" />);
    expect(screen.getByTestId("registration-step-pending_email_verification").getAttribute("data-state")).toBe(
      "complete",
    );
    expect(screen.getByTestId("registration-step-onboarding").getAttribute("data-state")).toBe(
      "current",
    );
  });
});
