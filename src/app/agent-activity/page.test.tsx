import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AgentActivityPage from "./page";

vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: (_loader: () => Promise<{ default: React.ComponentType }>, _opts?: { loading?: () => React.ReactNode }) => {
    const Stub = () => <div data-testid="feed-mock">FEED</div>;
    return Stub;
  },
}));

describe("AgentActivityPage", () => {
  it("renders the heading and the lazy-loaded feed component", () => {
    render(<AgentActivityPage />);
    expect(screen.getByRole("heading", { name: /Agent activity/i })).toBeInTheDocument();
    expect(screen.getByTestId("feed-mock")).toBeInTheDocument();
  });
});
