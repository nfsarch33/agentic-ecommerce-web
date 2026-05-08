import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ProductTypeSelector } from "./ProductTypeSelector";

describe("ProductTypeSelector", () => {
  it("renders the three options", () => {
    render(<ProductTypeSelector value="physical" onChange={() => {}} />);
    expect(screen.getByTestId("product-type-physical")).toBeChecked();
    expect(screen.getByTestId("product-type-digital")).not.toBeChecked();
    expect(screen.getByTestId("product-type-membership")).not.toBeChecked();
  });

  it("invokes onChange when a different option is selected", () => {
    const onChange = vi.fn();
    render(<ProductTypeSelector value="physical" onChange={onChange} />);
    fireEvent.click(screen.getByTestId("product-type-digital"));
    expect(onChange).toHaveBeenCalledWith("digital");
  });

  it("respects the disabled flag", () => {
    render(<ProductTypeSelector value="physical" onChange={() => {}} disabled />);
    expect(screen.getByTestId("product-type-digital")).toBeDisabled();
  });
});
