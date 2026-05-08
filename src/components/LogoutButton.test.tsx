import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LogoutButton } from "./LogoutButton";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

afterEach(() => {
  push.mockReset();
  refresh.mockReset();
});

describe("LogoutButton", () => {
  it("renders the default Log out label and stays enabled until clicked", () => {
    render(<LogoutButton />);
    const button = screen.getByRole("button", { name: /log out/i });
    expect(button).toBeEnabled();
  });

  it("posts to /api/auth/logout, then redirects to /login and refreshes the router", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<LogoutButton />);
    await user.click(screen.getByRole("button", { name: /log out/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/logout",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("still navigates to /login when the BFF logout call fails", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    render(<LogoutButton />);
    await user.click(screen.getByRole("button", { name: /log out/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
