import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import DeveloperApiPage from "./page";

describe("/developers/api page", () => {
  it("renders the v1 + v2 endpoint sections", () => {
    render(<DeveloperApiPage />);
    expect(screen.getByTestId("developer-api-v1")).toBeInTheDocument();
    expect(screen.getByTestId("developer-api-v2")).toBeInTheDocument();
    expect(screen.getByTestId("developer-api-spec-links")).toBeInTheDocument();
  });

  it("links to the canonical OpenAPI specs", () => {
    render(<DeveloperApiPage />);
    const v1Link = screen.getByTestId("spec-link-v1") as HTMLAnchorElement;
    const v2Link = screen.getByTestId("spec-link-v2") as HTMLAnchorElement;
    expect(v1Link.href).toContain("openapi.yaml");
    expect(v2Link.href).toContain("openapi-v2-preview.yaml");
  });
});
