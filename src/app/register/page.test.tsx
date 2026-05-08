import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import RegisterPage from "./page";

describe("/register page", () => {
  it("renders the registration form heading", () => {
    render(<RegisterPage />);
    expect(screen.getByTestId("register-page")).toBeInTheDocument();
    expect(screen.getByTestId("registration-form")).toBeInTheDocument();
  });
});
