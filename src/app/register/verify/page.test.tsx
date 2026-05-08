import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(""),
}));

import RegisterVerifyPage from "./page";

describe("/register/verify page", () => {
  it("renders the verify wrapper", () => {
    render(<RegisterVerifyPage />);
    expect(screen.getByTestId("register-verify-page")).toBeInTheDocument();
  });
});
