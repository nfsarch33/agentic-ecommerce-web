import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/server/auth-session", () => ({
  requireServerSession: vi.fn(async () => ({
    user: { id: "u-1", email: "alice@example.com", role: "viewer" as const },
    expiresAt: "2099-01-01T00:00:00Z",
  })),
}));

const listImpl = vi.fn();
vi.mock("@/lib/usecases/list-my-licenses", () => ({
  listMyLicensesUsecase: (input: unknown) => listImpl(input),
}));

import DigitalLibraryPage from "./page";

describe("/account/digital-library page", () => {
  beforeEach(() => {
    listImpl.mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the panel with the page heading", async () => {
    listImpl.mockResolvedValueOnce({ licenses: [], total: 0 });
    const ui = await DigitalLibraryPage();
    render(ui);
    expect(screen.getByRole("heading", { name: /My Digital Library/i })).toBeVisible();
    expect(screen.getByTestId("digital-library-empty")).toBeVisible();
  });

  it("propagates the usecase error into the panel", async () => {
    listImpl.mockResolvedValueOnce({ licenses: [], total: 0, error: "boom" });
    const ui = await DigitalLibraryPage();
    render(ui);
    expect(screen.getByTestId("digital-library-error")).toHaveTextContent("boom");
  });
});
