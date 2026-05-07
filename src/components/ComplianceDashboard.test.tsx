import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Product } from "@/lib/domain/product";
import {
  createComplianceResult,
  createSeoScore,
  type ComplianceRule,
} from "@/lib/domain/compliance";
import { ComplianceDashboard } from "./ComplianceDashboard";

const products = [
  Product.fromInput({
    id: "p_1",
    sku: "BAND-001",
    title: "Resistance Band Set",
    slug: "resistance-band-set",
    price: { amount: 2495, currency: "AUD" },
    stock: 12,
    description: "Progressive resistance band set with 5 tension levels.",
  }),
  Product.fromInput({
    id: "p_2",
    sku: "ROLLER-001",
    title: "Foam Roller",
    slug: "foam-roller",
    price: { amount: 3495, currency: "AUD" },
    stock: 5,
    description: "Dense EVA roller for recovery.",
  }),
];

const rules: ComplianceRule[] = [
  {
    id: "rule_title_claims",
    code: "title.claims",
    name: "No exaggerated claims",
    description: "Product copy must avoid unsupported superlatives.",
    category: "content",
    severity: "critical",
    enabled: true,
  },
  {
    id: "rule_alt_text",
    code: "image.alt_text",
    name: "Image alt text",
    description: "Product images need meaningful alt text.",
    category: "media",
    severity: "warning",
    enabled: true,
  },
];

const failedResult = createComplianceResult({
  productId: "p_1",
  status: "failed",
  score: 62,
  checkedAt: "2026-05-07T04:00:00Z",
  seoScore: createSeoScore({
    overall: 71,
    title: 80,
    metaDescription: 70,
    slug: 85,
    keywordDensity: 60,
    imageAltText: 60,
    recommendations: ["Use the target keyword in the meta description."],
  }),
  ruleResults: [
    {
      rule: rules[0]!,
      status: "failed",
      severity: "critical",
      reason: "Title claims the product is guaranteed to cure pain.",
    },
    {
      rule: rules[1]!,
      status: "needs_review",
      severity: "warning",
      reason: "Hero image alt text is missing.",
    },
  ],
});

const passedResult = createComplianceResult({
  productId: "p_2",
  status: "passed",
  score: 91,
  checkedAt: "2026-05-07T04:01:00Z",
  ruleResults: [],
});

describe("ComplianceDashboard", () => {
  it("renders product pass/fail summary and opens rule detail", async () => {
    const user = userEvent.setup();

    render(
      <ComplianceDashboard
        apiBaseUrl="http://api.test"
        products={products}
        rules={rules}
        initialResults={[failedResult, passedResult]}
        checkProductComplianceImpl={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: /compliance dashboard/i })).toBeInTheDocument();
    expect(screen.getByText("2 products")).toBeInTheDocument();
    expect(screen.getByText("1 passed")).toBeInTheDocument();
    expect(screen.getByText("1 failed")).toBeInTheDocument();
    expect(screen.getByText("77 average score")).toBeInTheDocument();

    const firstRow = screen.getByRole("row", { name: /resistance band set/i });
    expect(within(firstRow).getByText("Fail")).toBeInTheDocument();
    expect(within(firstRow).getByText("62/100")).toBeInTheDocument();

    await user.click(within(firstRow).getByRole("button", { name: /review resistance band set/i }));

    expect(
      screen.getByRole("heading", { name: /resistance band set compliance detail/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("critical")).toBeInTheDocument();
    expect(screen.getByText(/guaranteed to cure pain/i)).toBeInTheDocument();
    expect(screen.getByText("71/100")).toBeInTheDocument();
    expect(screen.getByText(/target keyword in the meta description/i)).toBeInTheDocument();
  });

  it("runs a bulk compliance check for selected products and updates the summary", async () => {
    const user = userEvent.setup();
    const checkProductComplianceImpl = vi
      .fn()
      .mockResolvedValueOnce({ ...failedResult, status: "passed", score: 88, ruleResults: [] })
      .mockResolvedValueOnce({ ...passedResult, score: 94 });

    render(
      <ComplianceDashboard
        apiBaseUrl="http://api.test"
        products={products}
        rules={rules}
        initialResults={[failedResult, passedResult]}
        checkProductComplianceImpl={checkProductComplianceImpl}
      />,
    );

    await user.click(screen.getByLabelText(/select resistance band set/i));
    await user.click(screen.getByLabelText(/select foam roller/i));
    await user.click(screen.getByRole("button", { name: /run bulk compliance check/i }));

    expect(checkProductComplianceImpl).toHaveBeenCalledTimes(2);
    expect(await screen.findByRole("status")).toHaveTextContent(/checked 2 products/i);
    expect(screen.getByText("2 passed")).toBeInTheDocument();
    expect(screen.queryByText("1 failed")).not.toBeInTheDocument();
  });

  it("requires at least one selected product before bulk checking", async () => {
    const user = userEvent.setup();
    const checkProductComplianceImpl = vi.fn();

    render(
      <ComplianceDashboard
        apiBaseUrl="http://api.test"
        products={products}
        rules={rules}
        initialResults={[failedResult, passedResult]}
        checkProductComplianceImpl={checkProductComplianceImpl}
      />,
    );

    await user.click(screen.getByRole("button", { name: /run bulk compliance check/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/select at least one product/i);
    expect(checkProductComplianceImpl).not.toHaveBeenCalled();
  });

  it("renders empty and initial failure states", () => {
    render(
      <ComplianceDashboard
        apiBaseUrl="http://api.test"
        products={[]}
        rules={[]}
        initialResults={[]}
        initialError="Unable to load compliance dashboard."
        checkProductComplianceImpl={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/unable to load compliance dashboard/i);
    expect(
      screen.getByText(/no products are available for compliance checks/i),
    ).toBeInTheDocument();
    expect(screen.getByText("0 active rules loaded")).toBeInTheDocument();
  });

  it("can deselect products and surfaces adapter errors", async () => {
    const user = userEvent.setup();
    const checkProductComplianceImpl = vi
      .fn()
      .mockRejectedValue(new Error("compliance backend unavailable"));

    render(
      <ComplianceDashboard
        apiBaseUrl="http://api.test"
        products={products}
        rules={rules}
        initialResults={[{ ...failedResult, status: "needs_review" }, passedResult]}
        checkProductComplianceImpl={checkProductComplianceImpl}
      />,
    );

    await user.click(screen.getByLabelText(/select resistance band set/i));
    await user.click(screen.getByLabelText(/select resistance band set/i));
    await user.click(screen.getByRole("button", { name: /run bulk compliance check/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/select at least one product/i);

    await user.click(screen.getByLabelText(/select resistance band set/i));
    await user.click(screen.getByRole("button", { name: /run bulk compliance check/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("compliance backend unavailable");
    expect(screen.getByText("1 need review")).toBeInTheDocument();
  });
});
