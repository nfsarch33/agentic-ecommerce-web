import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Loading from "./loading";

describe("ProductsLoading", () => {
  it("renders a loading indicator", () => {
    render(<Loading />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("includes accessible loading text", () => {
    render(<Loading />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
