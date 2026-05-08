import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { DigitalProduct } from "@/lib/domain/digital";
import { DigitalProductManagement } from "./DigitalProductManagement";

function product(): DigitalProduct {
  return {
    id: "prod-1",
    tenantId: "tenant-a",
    sku: "PDF-001",
    name: "Sample PDF",
    filePath: "tenant-a/x.pdf",
    fileSize: 2048,
    version: "1.0.0",
    createdAt: "2026-05-08T12:00:00Z",
    updatedAt: "2026-05-08T12:00:00Z",
  };
}

describe("DigitalProductManagement", () => {
  it("renders empty state with CTA for operators", () => {
    render(
      <DigitalProductManagement
        initialProducts={[]}
        userRole="operator"
        tenantId="tenant-a"
        baseUrl="http://api.test"
      />,
    );
    expect(screen.getByTestId("digital-products-empty")).toBeVisible();
    expect(screen.getByRole("link", { name: /add a digital product/i })).toBeVisible();
  });

  it("hides the create CTA for viewers", () => {
    render(
      <DigitalProductManagement
        initialProducts={[]}
        userRole="viewer"
        tenantId="tenant-a"
        baseUrl="http://api.test"
      />,
    );
    expect(screen.queryByRole("link", { name: /add a digital product/i })).toBeNull();
  });

  it("surfaces an error in the empty state", () => {
    render(
      <DigitalProductManagement
        initialProducts={[]}
        userRole="operator"
        tenantId="tenant-a"
        baseUrl="http://api.test"
        error="HTTP 500"
      />,
    );
    expect(screen.getByTestId("digital-products-error")).toHaveTextContent("HTTP 500");
  });

  it("renders the product list with size formatting", () => {
    render(
      <DigitalProductManagement
        initialProducts={[product()]}
        userRole="operator"
        tenantId="tenant-a"
        baseUrl="http://api.test"
      />,
    );
    expect(screen.getByTestId("digital-product-row-prod-1")).toHaveTextContent("PDF-001");
    expect(screen.getByText(/2\.0 kB/)).toBeInTheDocument();
  });
});
