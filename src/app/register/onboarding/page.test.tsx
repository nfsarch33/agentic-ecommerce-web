import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(""),
}));

import OnboardingPage from "./page";

describe("/register/onboarding page", () => {
  it("renders the wrapper", () => {
    render(<OnboardingPage />);
    expect(screen.getByTestId("register-onboarding-page")).toBeInTheDocument();
  });
});
