import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DEFAULT_DEVELOPER_DOC_SECTIONS, DeveloperDocsLayout } from "@/components/DeveloperDocsLayout";

describe("DeveloperDocsLayout", () => {
  it("renders hero heading and supplied body", () => {
    render(<DeveloperDocsLayout sections={DEFAULT_DEVELOPER_DOC_SECTIONS} heroTitle="Custom Title" heroBody="Custom body" />);
    expect(screen.getByText("Custom Title")).toBeDefined();
    expect(screen.getByText("Custom body")).toBeDefined();
  });

  it("renders one card per section", () => {
    render(<DeveloperDocsLayout sections={DEFAULT_DEVELOPER_DOC_SECTIONS} />);
    for (const section of DEFAULT_DEVELOPER_DOC_SECTIONS) {
      expect(screen.getByTestId(`developer-docs-section-${section.id}`)).toBeDefined();
    }
  });

  it("renders children inside the prose region", () => {
    render(
      <DeveloperDocsLayout sections={[]}>
        <p data-testid="docs-body">Hello</p>
      </DeveloperDocsLayout>,
    );
    expect(screen.getByTestId("docs-body").textContent).toBe("Hello");
  });
});
