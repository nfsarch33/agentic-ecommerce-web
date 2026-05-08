import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UsageProgressBar } from "./UsageProgressBar";

describe("UsageProgressBar", () => {
  it("renders the metric and value", () => {
    render(<UsageProgressBar rollup={{ metric: "api.requests", value: 50, limit: 100 }} />);
    expect(screen.getByTestId("usage-api.requests")).toBeInTheDocument();
    expect(screen.getByTestId("usage-value-api.requests").textContent).toContain("50");
  });

  it("warns when over threshold", () => {
    render(<UsageProgressBar rollup={{ metric: "agent.runs", value: 90, limit: 100 }} thresholdWarn={0.8} />);
    const bar = screen.getByTestId("usage-bar-agent.runs");
    expect(bar.className).toContain("amber");
  });
});
