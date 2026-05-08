import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { GettingStartedSteps } from "./GettingStartedSteps";

describe("GettingStartedSteps", () => {
  it("renders the default 5 steps", () => {
    render(<GettingStartedSteps />);
    expect(screen.getByTestId("getting-started-step-register-tenant")).toBeInTheDocument();
    expect(screen.getByTestId("getting-started-step-scaffold-plugin")).toBeInTheDocument();
    expect(screen.getByTestId("getting-started-step-implement-plugin")).toBeInTheDocument();
    expect(screen.getByTestId("getting-started-step-smoke-test")).toBeInTheDocument();
    expect(screen.getByTestId("getting-started-step-submit-plugin")).toBeInTheDocument();
  });

  it("renders snippets for steps that ship code", () => {
    render(<GettingStartedSteps />);
    expect(screen.getByTestId("getting-started-snippet-scaffold-plugin")).toBeInTheDocument();
    expect(screen.getByTestId("getting-started-snippet-implement-plugin")).toBeInTheDocument();
    expect(screen.getByTestId("getting-started-snippet-smoke-test")).toBeInTheDocument();
  });

  it("accepts custom steps", () => {
    render(
      <GettingStartedSteps
        steps={[{ id: "custom", title: "Custom", description: "Custom step", snippet: "echo hi" }]}
      />,
    );
    expect(screen.getByTestId("getting-started-step-custom")).toBeInTheDocument();
    expect(screen.getByTestId("getting-started-snippet-custom")).toBeInTheDocument();
  });
});
