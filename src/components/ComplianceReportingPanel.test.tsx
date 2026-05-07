import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ComplianceReportSummary, CustomComplianceRule } from "@/lib/domain/compliance";
import { ComplianceReportingPanel } from "./ComplianceReportingPanel";

const reportSummary: ComplianceReportSummary = {
  tenantId: "tenant_default",
  period: "30d",
  generatedAt: "2026-05-08T00:00:00Z",
  totals: { checks: 10, passed: 7, failed: 2, needsReview: 1 },
  passRate: 70,
  failRate: 20,
  averageScore: 83,
  trends: [
    { date: "2026-05-01", passed: 3, failed: 1, needsReview: 0, averageScore: 84 },
    { date: "2026-05-02", passed: 4, failed: 1, needsReview: 1, averageScore: 82 },
  ],
  ruleCoverage: [
    { ruleId: "rule_alt_text", ruleName: "Image alt text", checked: 10, passed: 8, failed: 2 },
    { ruleId: "rule_claims", ruleName: "No exaggerated claims", checked: 6, passed: 6, failed: 0 },
  ],
};

const customRule: CustomComplianceRule = {
  id: "custom_health_claims",
  tenantId: "tenant_default",
  code: "copy.health_claims",
  name: "Health claim guardrail",
  description: "Reject unsupported medical claims.",
  category: "legal",
  severity: "critical",
  enabled: true,
  condition: { field: "description", operator: "does_not_contain", value: "cure" },
  version: 1,
  updatedAt: "2026-05-08T00:00:00Z",
};

describe("ComplianceReportingPanel", () => {
  it("renders pass/fail trends, rule coverage, and export controls", async () => {
    const user = userEvent.setup();
    const exportReportImpl = vi.fn().mockResolvedValue({
      filename: "compliance-report.csv",
      mimeType: "text/csv",
      content: "rule,passed\nalt_text,8\n",
    });

    render(
      <ComplianceReportingPanel
        apiBaseUrl="http://api.test"
        reportSummary={reportSummary}
        customRules={[customRule]}
        exportReportImpl={exportReportImpl}
        createRuleImpl={vi.fn()}
        updateRuleImpl={vi.fn()}
        deleteRuleImpl={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: /compliance reporting/i })).toBeInTheDocument();
    expect(screen.getByText("70% pass rate")).toBeInTheDocument();
    expect(screen.getByText("20% fail rate")).toBeInTheDocument();
    expect(screen.getByText(/2026-05-01/)).toBeInTheDocument();
    expect(screen.getByText(/Image alt text/)).toBeInTheDocument();
    expect(screen.getByText("80% coverage")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /export csv/i }));

    expect(exportReportImpl).toHaveBeenCalledWith({
      baseUrl: "http://api.test",
      tenantId: "tenant_default",
      format: "csv",
    });
    expect(await screen.findByRole("status")).toHaveTextContent(/exported compliance-report.csv/i);
  });

  it("creates, edits, disables, and deletes custom tenant rules", async () => {
    const user = userEvent.setup();
    const createRuleImpl = vi
      .fn()
      .mockResolvedValue({ ...customRule, id: "custom_seo_title", name: "SEO title guardrail" });
    const updateRuleImpl = vi.fn().mockResolvedValue({ ...customRule, enabled: false });
    const deleteRuleImpl = vi.fn().mockResolvedValue(undefined);

    render(
      <ComplianceReportingPanel
        apiBaseUrl="http://api.test"
        reportSummary={reportSummary}
        customRules={[customRule]}
        exportReportImpl={vi.fn()}
        createRuleImpl={createRuleImpl}
        updateRuleImpl={updateRuleImpl}
        deleteRuleImpl={deleteRuleImpl}
      />,
    );

    await user.type(screen.getByLabelText(/rule name/i), "SEO title guardrail");
    await user.type(screen.getByLabelText(/rule code/i), "seo.title_length");
    await user.type(screen.getByLabelText(/description/i), "Require clear SEO titles.");
    await user.type(screen.getByLabelText(/field/i), "title");
    await user.type(screen.getByLabelText(/value/i), "sale");
    await user.click(screen.getByRole("button", { name: /create rule/i }));

    expect(createRuleImpl).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: "http://api.test",
        rule: expect.objectContaining({ tenantId: "tenant_default", name: "SEO title guardrail" }),
      }),
    );
    expect(await screen.findByText("SEO title guardrail")).toBeInTheDocument();

    const healthRule = screen.getByRole("article", { name: /health claim guardrail/i });
    await user.click(within(healthRule).getByRole("button", { name: /disable/i }));
    expect(updateRuleImpl).toHaveBeenCalledWith({
      baseUrl: "http://api.test",
      ruleId: "custom_health_claims",
      patch: expect.objectContaining({ tenantId: "tenant_default", enabled: false }),
    });
    expect(await screen.findByRole("status")).toHaveTextContent(/custom rule disabled/i);

    await user.click(
      within(screen.getByRole("article", { name: /health claim guardrail/i })).getByRole("button", {
        name: /delete/i,
      }),
    );
    expect(deleteRuleImpl).toHaveBeenCalledWith({
      baseUrl: "http://api.test",
      tenantId: "tenant_default",
      ruleId: "custom_health_claims",
    });
  });
});
