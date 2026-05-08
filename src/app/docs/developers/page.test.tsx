import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import DeveloperDocsPage from "./page";

describe("/docs/developers page", () => {
  it("renders the developer docs layout with all sections", () => {
    render(<DeveloperDocsPage />);
    expect(screen.getByTestId("developer-docs-layout")).toBeInTheDocument();
    expect(screen.getByTestId("developer-docs-section-manifest")).toBeInTheDocument();
    expect(screen.getByTestId("developer-docs-section-sdk")).toBeInTheDocument();
    expect(screen.getByTestId("developer-docs-section-submission")).toBeInTheDocument();
    expect(screen.getByTestId("developer-docs-section-events")).toBeInTheDocument();
    expect(screen.getByTestId("developer-docs-section-rate-limits")).toBeInTheDocument();
    expect(screen.getByTestId("developer-docs-section-openapi")).toBeInTheDocument();
  });
});
