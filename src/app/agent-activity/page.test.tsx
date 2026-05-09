import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AgentActivityPage from "./page";

// The feed component is exercised by AgentActivityFeed.test.tsx;
// this page test just ensures the server shell wires it in and
// renders the heading + intro copy.
vi.mock("@/components/AgentActivityFeed", () => ({
  AgentActivityFeed: () => <div data-testid="feed-mock">FEED</div>,
}));

describe("AgentActivityPage", () => {
  it("renders the heading and the feed component", () => {
    render(<AgentActivityPage />);
    expect(screen.getByRole("heading", { name: /Agent activity/i })).toBeInTheDocument();
    expect(screen.getByTestId("feed-mock")).toBeInTheDocument();
  });
});
