import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CompliancePage from "./page";

vi.mock("@/lib/usecases/compliance-dashboard", () => ({
  loadComplianceDashboard: vi.fn(),
}));

vi.mock("@/components/ComplianceDashboard", () => ({
  ComplianceDashboard: ({
    products,
    initialResults,
    initialError,
  }: {
    products: Array<{ title: string }>;
    initialResults: Array<{ productId: string }>;
    initialError?: string;
  }) => (
    <div>
      <h1>Compliance Dashboard</h1>
      <p>Products: {products.length}</p>
      <p>Results: {initialResults.length}</p>
      {initialError && <p role="alert">{initialError}</p>}
      {products.map((product) => (
        <p key={product.title}>{product.title}</p>
      ))}
    </div>
  ),
}));

import { loadComplianceDashboard } from "@/lib/usecases/compliance-dashboard";

const mockLoadComplianceDashboard = vi.mocked(loadComplianceDashboard);

describe("Admin compliance page", () => {
  it("loads products, rules, and initial results from the backend", async () => {
    mockLoadComplianceDashboard.mockResolvedValue({
      products: [{ id: "p_1", title: "Resistance Band Set" }] as never,
      rules: [{ id: "rule_1", name: "Image alt text" }] as never,
      results: [{ productId: "p_1" }] as never,
      summary: { total: 1, passed: 1, failed: 0, needsReview: 0, averageScore: 92 },
    });

    render(await CompliancePage());

    expect(screen.getByRole("heading", { name: /compliance dashboard/i })).toBeInTheDocument();
    expect(screen.getByText("Products: 1")).toBeInTheDocument();
    expect(screen.getByText("Results: 1")).toBeInTheDocument();
    expect(screen.getByText("Resistance Band Set")).toBeInTheDocument();
    expect(mockLoadComplianceDashboard).toHaveBeenCalledWith(
      expect.objectContaining({ baseUrl: "http://localhost:8080" }),
    );
  });

  it("renders a failure state when the backend dashboard load fails", async () => {
    mockLoadComplianceDashboard.mockRejectedValue(new Error("backend unavailable"));

    render(await CompliancePage());

    expect(screen.getByRole("heading", { name: /compliance dashboard/i })).toBeInTheDocument();
    expect(screen.getByText("Products: 0")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("backend unavailable");
  });
});
