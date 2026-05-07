import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClaimEvidenceList } from "./ClaimEvidenceList";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { EvidenceSourceCard } from "./EvidenceSourceCard";
import { RAGSourceViewer } from "./RAGSourceViewer";
import type { EvidenceSource, FactCheckResult } from "@/lib/domain/fact-check";

const source: EvidenceSource = {
  id: "ev_1",
  title: "Resistance Band Product Manual",
  uri: "s3://rag-docs/resistance-band-manual.md",
  excerpt: "The set includes five latex bands with progressive tension levels.",
  similarity: 0.91,
  sourceType: "manual",
  metadata: { page: 2, section: "Specifications" },
};

const result: FactCheckResult = {
  id: "fc_1",
  productId: "p_1",
  suggestionId: "sug_1",
  overallConfidence: { score: 86, label: "High" },
  status: "supported",
  checkedAt: "2026-05-08T01:00:00Z",
  claims: [
    {
      id: "claim_1",
      text: "The set includes five tension levels.",
      confidence: { score: 92, label: "High" },
      verdict: "supported",
      evidence: [source],
      explanation: "Product manual confirms this claim.",
    },
    {
      id: "claim_2",
      text: "The bands cure chronic pain.",
      confidence: { score: 28, label: "Low" },
      verdict: "contradicted",
      evidence: [],
      explanation: "No source supports a medical claim.",
    },
  ],
};

describe("fact-check evidence components", () => {
  it("renders confidence badges with accessible labels and threshold styling", () => {
    render(<ConfidenceBadge confidence={{ score: 86, label: "High" }} />);

    expect(screen.getByLabelText("High factual confidence, 86 percent")).toHaveTextContent("High 86%");
  });

  it("renders source cards with excerpt, score, and metadata", () => {
    render(<EvidenceSourceCard source={source} />);

    expect(screen.getByRole("article", { name: /resistance band product manual/i })).toBeInTheDocument();
    expect(screen.getByText(/five latex bands/i)).toBeInTheDocument();
    expect(screen.getByText("91% match")).toBeInTheDocument();
    expect(screen.getByText("page: 2")).toBeInTheDocument();
  });

  it("renders claim evidence summary, claim verdicts, and empty evidence states", () => {
    render(<ClaimEvidenceList result={result} />);

    expect(screen.getByRole("heading", { name: /fact-check evidence/i })).toBeInTheDocument();
    expect(screen.getByText("1 supported")).toBeInTheDocument();
    expect(screen.getByText("1 contradicted")).toBeInTheDocument();
    expect(screen.getByText("0 need evidence")).toBeInTheDocument();
    expect(screen.getByText("The set includes five tension levels.")).toBeInTheDocument();
    expect(screen.getByText(/No RAG evidence was returned for this claim/i)).toBeInTheDocument();
  });

  it("renders loading, error, and empty claim states", () => {
    const { rerender } = render(<ClaimEvidenceList isLoading />);
    expect(screen.getByRole("status")).toHaveTextContent(/checking generated copy/i);

    rerender(<ClaimEvidenceList error="Fact-check endpoint unavailable" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Fact-check endpoint unavailable");

    rerender(<ClaimEvidenceList result={{ ...result, claims: [] }} />);
    expect(screen.getByText(/No factual claims were extracted/i)).toBeInTheDocument();
  });

  it("searches RAG evidence sources and renders returned documents", async () => {
    const user = userEvent.setup();
    const searchEvidenceImpl = vi.fn().mockResolvedValue([source]);

    render(<RAGSourceViewer productId="p_1" searchEvidenceImpl={searchEvidenceImpl} />);

    await user.type(screen.getByLabelText(/search source library/i), "five tension levels");
    await user.click(screen.getByRole("button", { name: /search evidence/i }));

    expect(searchEvidenceImpl).toHaveBeenCalledWith({ query: "five tension levels", productId: "p_1" });
    const viewer = await screen.findByRole("region", { name: /rag source viewer/i });
    expect(within(viewer).getByText("Resistance Band Product Manual")).toBeInTheDocument();
  });

  it("shows RAG source viewer validation, loading, error, and empty states", async () => {
    const user = userEvent.setup();
    const searchEvidenceImpl = vi.fn().mockResolvedValue([]);

    render(<RAGSourceViewer productId="p_1" searchEvidenceImpl={searchEvidenceImpl} />);

    await user.click(screen.getByRole("button", { name: /search evidence/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/enter a source search query/i);

    await user.type(screen.getByLabelText(/search source library/i), "unknown claim");
    await user.click(screen.getByRole("button", { name: /search evidence/i }));
    expect(await screen.findByText(/No RAG sources matched this query/i)).toBeInTheDocument();
  });
});
