import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RegistrationForm } from "./RegistrationForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("RegistrationForm", () => {
  it("rejects invalid email", () => {
    render(<RegistrationForm baseUrl="http://x" />);
    fireEvent.change(screen.getByTestId("register-email"), { target: { value: "no" } });
    expect(screen.getByTestId("register-email-error")).toBeInTheDocument();
  });

  it("submits and shows accepted state", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          registration: {
            id: "reg_1",
            email: "alice@example.com",
            slug_requested: "tenant-a",
            plan_requested: "free",
            status: "pending_email_verification",
          },
          message: "ok",
        }),
        { status: 202, headers: new Headers({ "content-type": "application/json" }) },
      ),
    );
    vi.stubGlobal("fetch", fetchImpl as unknown as typeof fetch);
    render(<RegistrationForm baseUrl="http://x" />);
    fireEvent.change(screen.getByTestId("register-email"), {
      target: { value: "alice@example.com" },
    });
    fireEvent.change(screen.getByTestId("register-slug"), { target: { value: "tenant-a" } });
    fireEvent.click(screen.getByTestId("register-submit"));
    await waitFor(() => expect(screen.getByTestId("register-accepted")).toBeInTheDocument());
    vi.unstubAllGlobals();
  });

  it("renders backend error", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ error: "slug_taken" }), { status: 409, headers: new Headers({ "content-type": "application/json" }) }),
    );
    vi.stubGlobal("fetch", fetchImpl as unknown as typeof fetch);
    render(<RegistrationForm baseUrl="http://x" />);
    fireEvent.change(screen.getByTestId("register-email"), {
      target: { value: "alice@example.com" },
    });
    fireEvent.change(screen.getByTestId("register-slug"), { target: { value: "tenant-a" } });
    fireEvent.click(screen.getByTestId("register-submit"));
    await waitFor(() => expect(screen.getByTestId("register-error")).toBeInTheDocument());
    vi.unstubAllGlobals();
  });
});
