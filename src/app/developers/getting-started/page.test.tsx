import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import DeveloperGettingStartedPage from "./page";

describe("/developers/getting-started page", () => {
  it("renders the getting-started step list", () => {
    render(<DeveloperGettingStartedPage />);
    expect(screen.getByTestId("getting-started-steps")).toBeInTheDocument();
    expect(screen.getByTestId("getting-started-step-register-tenant")).toBeInTheDocument();
    expect(screen.getByTestId("getting-started-step-submit-plugin")).toBeInTheDocument();
  });
});
