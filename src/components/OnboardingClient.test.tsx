import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OnboardingClient } from "./OnboardingClient";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams("registration_id=reg_1"),
}));

describe("OnboardingClient", () => {
  it("provisions tenant and shows success", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          registration: {
            id: "reg_1",
            email: "alice@example.com",
            slug_requested: "tenant-a",
            plan_requested: "starter",
            status: "active",
            tenant_id: "tenant-a",
          },
          tenant: {
            id: "tenant-a",
            slug: "tenant-a",
            name: "Acme",
            plan: "starter",
            status: "active",
            created_at: "2026-05-08T00:00:00Z",
            updated_at: "2026-05-08T00:00:00Z",
          },
        }),
        { status: 200, headers: new Headers({ "content-type": "application/json" }) },
      ),
    );
    vi.stubGlobal("fetch", fetchImpl as unknown as typeof fetch);
    render(<OnboardingClient baseUrl="http://x" />);
    fireEvent.change(screen.getByTestId("onboarding-company"), { target: { value: "Acme" } });
    fireEvent.click(screen.getByTestId("onboarding-submit"));
    await waitFor(() => expect(screen.getByTestId("onboarding-success")).toBeInTheDocument());
    vi.unstubAllGlobals();
  });

  it("shows backend error", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ error: "slug_taken" }), { status: 409, headers: new Headers({ "content-type": "application/json" }) }),
    );
    vi.stubGlobal("fetch", fetchImpl as unknown as typeof fetch);
    render(<OnboardingClient baseUrl="http://x" />);
    fireEvent.change(screen.getByTestId("onboarding-company"), { target: { value: "Acme" } });
    fireEvent.click(screen.getByTestId("onboarding-submit"));
    await waitFor(() => expect(screen.getByTestId("onboarding-error")).toBeInTheDocument());
    vi.unstubAllGlobals();
  });
});
