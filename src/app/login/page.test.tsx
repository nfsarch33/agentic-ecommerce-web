import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import LoginPage from "./page";

describe("LoginPage", () => {
  it("renders the admin sign-in headline and the LoginForm", () => {
    render(<LoginPage />);
    expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("explains that sessions are stored in a secure httpOnly cookie", () => {
    render(<LoginPage />);
    expect(
      screen.getByText(/sessions are stored in a secure httpOnly cookie/i),
    ).toBeInTheDocument();
  });
});
