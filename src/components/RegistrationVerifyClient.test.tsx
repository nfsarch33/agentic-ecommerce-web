import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RegistrationVerifyClient } from "./RegistrationVerifyClient";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams("token=abc"),
}));

describe("RegistrationVerifyClient", () => {
  it("verifies and shows success", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          id: "reg_1",
          email: "alice@example.com",
          slug_requested: "tenant-a",
          plan_requested: "free",
          status: "email_verified",
        }),
        { status: 200, headers: new Headers({ "content-type": "application/json" }) },
      ),
    );
    vi.stubGlobal("fetch", fetchImpl as unknown as typeof fetch);
    render(<RegistrationVerifyClient baseUrl="http://x" />);
    await waitFor(() =>
      expect(screen.getByTestId("register-verify-success")).toBeInTheDocument(),
    );
    vi.unstubAllGlobals();
  });

  it("renders backend error", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 401 }));
    vi.stubGlobal("fetch", fetchImpl as unknown as typeof fetch);
    render(<RegistrationVerifyClient baseUrl="http://x" />);
    await waitFor(() =>
      expect(screen.getByTestId("register-verify-error")).toBeInTheDocument(),
    );
    vi.unstubAllGlobals();
  });
});
