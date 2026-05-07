import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Product } from "@/lib/domain/product";
import { createAISuggestion } from "@/lib/domain/ai-description";
import { AIProductDescriptionPanel } from "./AIProductDescriptionPanel";

const product = Product.fromInput({
  id: "p_1",
  sku: "BAND-001",
  title: "Resistance Band Set",
  slug: "resistance-band-set",
  price: { amount: 2495, currency: "AUD" },
  stock: 12,
  description: "Progressive resistance band set with 5 tension levels.",
});

const suggestion = createAISuggestion({
  id: "sug_1",
  productId: product.id,
  description: "Train anywhere with a durable five-band set designed for progressive resistance.",
  status: "generated",
  qualityScore: {
    readability: 82,
    seo: 78,
    tone: 90,
    length: 80,
    factual: 88,
  },
  createdAt: "2026-05-07T04:00:00Z",
});

describe("AIProductDescriptionPanel", () => {
  it("renders current and generated descriptions side by side with quality scores", () => {
    render(
      <AIProductDescriptionPanel
        apiBaseUrl="http://api.test"
        product={product}
        initialSuggestions={[suggestion]}
        generateDescriptionImpl={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: /ai description studio/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /current description/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /generated suggestion/i })).toBeInTheDocument();
    expect(screen.getAllByText("Progressive resistance band set with 5 tension levels.")).toHaveLength(2);
    expect(screen.getByText(/Train anywhere with a durable/)).toBeInTheDocument();
    expect(screen.getByText("Readability")).toBeInTheDocument();
    expect(screen.getByText("SEO")).toBeInTheDocument();
    expect(screen.getByText("Factual")).toBeInTheDocument();
  });

  it("generates a new suggestion and renders its preview", async () => {
    const user = userEvent.setup();
    const generateDescriptionImpl = vi.fn().mockResolvedValue({
      ...suggestion,
      id: "sug_2",
      description: "Fresh AI copy focused on ecommerce conversion.",
    });

    render(
      <AIProductDescriptionPanel
        apiBaseUrl="http://api.test"
        product={product}
        initialSuggestions={[]}
        generateDescriptionImpl={generateDescriptionImpl}
      />,
    );

    await user.clear(screen.getByLabelText(/generation prompt/i));
    await user.type(screen.getByLabelText(/generation prompt/i), "Make it punchier");
    await user.click(screen.getByRole("button", { name: /generate description/i }));

    expect(generateDescriptionImpl).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: "http://api.test",
        productId: product.id,
        prompt: "Make it punchier",
      }),
    );
    expect(await screen.findByText("Fresh AI copy focused on ecommerce conversion.")).toBeInTheDocument();
  });

  it("approves, edits, and rejects a generated suggestion", async () => {
    const user = userEvent.setup();

    render(
      <AIProductDescriptionPanel
        apiBaseUrl="http://api.test"
        product={product}
        initialSuggestions={[suggestion]}
        generateDescriptionImpl={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /approve suggestion/i }));
    expect(screen.getByLabelText(/editable description/i)).toHaveValue(suggestion.description);
    expect(screen.getByText(/suggestion approved/i)).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/editable description/i));
    await user.type(screen.getByLabelText(/editable description/i), "Operator-edited approved copy.");
    expect(screen.getByLabelText(/editable description/i)).toHaveValue("Operator-edited approved copy.");

    await user.click(screen.getByRole("button", { name: /reject suggestion/i }));
    expect(screen.getByText(/no active ai suggestion/i)).toBeInTheDocument();
    expect(screen.getByText(/suggestion rejected/i)).toBeInTheDocument();
  });

  it("shows a validation state when the generation prompt is blank", async () => {
    const user = userEvent.setup();
    const generateDescriptionImpl = vi.fn();

    render(
      <AIProductDescriptionPanel
        apiBaseUrl="http://api.test"
        product={product}
        initialSuggestions={[]}
        generateDescriptionImpl={generateDescriptionImpl}
      />,
    );

    await user.clear(screen.getByLabelText(/generation prompt/i));
    await user.click(screen.getByRole("button", { name: /generate description/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/enter a generation prompt/i);
    expect(generateDescriptionImpl).not.toHaveBeenCalled();
  });

  it("renders no-description and no-quality states", () => {
    const productWithoutDescription = Product.fromInput({
      ...product,
      description: undefined,
    });
    render(
      <AIProductDescriptionPanel
        apiBaseUrl="http://api.test"
        product={productWithoutDescription}
        initialSuggestions={[{ ...suggestion, qualityScore: undefined, source: "bff_fallback" }]}
        generateDescriptionImpl={vi.fn()}
      />,
    );

    expect(screen.getByText(/no current description is set/i)).toBeInTheDocument();
    expect(screen.getByText("BFF fallback")).toBeInTheDocument();
    expect(screen.getByText(/quality score unavailable/i)).toBeInTheDocument();
  });

  it("shows adapter errors when generation fails", async () => {
    const user = userEvent.setup();
    const generateDescriptionImpl = vi.fn().mockRejectedValue(new Error("backend unavailable"));

    render(
      <AIProductDescriptionPanel
        apiBaseUrl="http://api.test"
        product={product}
        initialSuggestions={[]}
        generateDescriptionImpl={generateDescriptionImpl}
      />,
    );

    await user.click(screen.getByRole("button", { name: /generate description/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("backend unavailable");
  });
});
