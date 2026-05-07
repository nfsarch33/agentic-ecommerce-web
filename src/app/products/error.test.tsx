"use client";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorBoundary from "./error";

describe("ProductsError", () => {
  it("renders an error message", () => {
    const error = new Error("Connection refused");
    render(<ErrorBoundary error={error} reset={vi.fn()} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/connection refused/i)).toBeInTheDocument();
  });

  it("provides a retry button that calls reset", async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    render(<ErrorBoundary error={new Error("fail")} reset={reset} />);
    const button = screen.getByRole("button", { name: /try again/i });
    await user.click(button);
    expect(reset).toHaveBeenCalledOnce();
  });

  it("displays the error message text", () => {
    const error = new Error("Network timeout");
    render(<ErrorBoundary error={error} reset={vi.fn()} />);
    expect(screen.getByText(/network timeout/i)).toBeInTheDocument();
  });
});
