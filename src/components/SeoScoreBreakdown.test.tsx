import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createSeoScore } from "@/lib/domain/compliance";
import { SeoScoreBreakdown } from "./SeoScoreBreakdown";

describe("SeoScoreBreakdown", () => {
  it("renders overall score, dimension scores, and recommendations", () => {
    const score = createSeoScore({
      overall: 74,
      title: 80,
      metaDescription: 70,
      slug: 85,
      keywordDensity: 60,
      imageAltText: 75,
      recommendations: ["Use the target keyword in the meta description."],
    });

    render(<SeoScoreBreakdown score={score} />);

    expect(screen.getByRole("heading", { name: /seo score/i })).toBeInTheDocument();
    expect(screen.getByText("74/100")).toBeInTheDocument();
    expect(screen.getByText("Needs work")).toBeInTheDocument();
    expect(screen.getByText("Meta description")).toBeInTheDocument();
    expect(screen.getByText("Keyword density")).toBeInTheDocument();
    expect(screen.getByText("Use the target keyword in the meta description.")).toBeInTheDocument();
  });

  it("renders an unavailable state when no score has been checked", () => {
    render(<SeoScoreBreakdown score={undefined} />);

    expect(screen.getByText(/run compliance to load an seo score/i)).toBeInTheDocument();
  });
});
