import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ApiVersionToggle } from "./ApiVersionToggle";

describe("ApiVersionToggle", () => {
  it("defaults to the v1 stable surface", () => {
    render(
      <ApiVersionToggle v1SpecUrl="https://example.test/openapi.yaml" v2SpecUrl="https://example.test/v2.yaml" />,
    );
    expect(screen.getByTestId("api-version-v1")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByTestId("api-version-panel-v1")).toBeInTheDocument();
  });

  it("switches to the v2 preview surface", () => {
    render(
      <ApiVersionToggle v1SpecUrl="https://example.test/openapi.yaml" v2SpecUrl="https://example.test/v2.yaml" />,
    );
    fireEvent.click(screen.getByTestId("api-version-v2"));
    expect(screen.getByTestId("api-version-v2")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByTestId("api-version-panel-v2")).toBeInTheDocument();
    expect(screen.getByTestId("api-version-spec-link")).toHaveAttribute("href", "https://example.test/v2.yaml");
  });

  it("renders the v2 panel when initialVersion is v2", () => {
    render(
      <ApiVersionToggle
        v1SpecUrl="https://example.test/openapi.yaml"
        v2SpecUrl="https://example.test/v2.yaml"
        initialVersion="v2"
      />,
    );
    expect(screen.getByTestId("api-version-v2")).toHaveAttribute("aria-checked", "true");
  });
});
