import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import DeveloperSdkPage from "./page";

describe("/developers/sdk page", () => {
  it("renders the SDK symbols table", () => {
    render(<DeveloperSdkPage />);
    expect(screen.getByTestId("sdk-symbols")).toBeInTheDocument();
    expect(screen.getByTestId("sdk-symbol-Plugin")).toBeInTheDocument();
    expect(screen.getByTestId("sdk-symbol-NewTestSandbox")).toBeInTheDocument();
  });

  it("renders the example plugin snippet", () => {
    render(<DeveloperSdkPage />);
    expect(screen.getByTestId("sdk-example")).toBeInTheDocument();
    expect(screen.getByTestId("sdk-example-snippet")).toHaveTextContent("go test ./pkg/marketplace/sdk/example/hello");
  });

  it("links to the SDK source and README on GitHub", () => {
    render(<DeveloperSdkPage />);
    expect(screen.getByTestId("sdk-link-repo")).toBeInTheDocument();
    expect(screen.getByTestId("sdk-link-readme")).toBeInTheDocument();
  });
});
