import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import DevelopersPortalPage from "./page";

describe("/developers portal page", () => {
  it("renders the six portal cards", () => {
    render(<DevelopersPortalPage />);
    expect(screen.getByTestId("developer-card-getting-started")).toBeInTheDocument();
    expect(screen.getByTestId("developer-card-sdk")).toBeInTheDocument();
    expect(screen.getByTestId("developer-card-api")).toBeInTheDocument();
    expect(screen.getByTestId("developer-card-marketplace")).toBeInTheDocument();
    expect(screen.getByTestId("developer-card-submission-flow")).toBeInTheDocument();
    expect(screen.getByTestId("developer-card-openapi-yaml")).toBeInTheDocument();
  });

  it("includes the stability policy summary", () => {
    render(<DevelopersPortalPage />);
    expect(screen.getByTestId("developer-policy-summary")).toBeInTheDocument();
  });
});
