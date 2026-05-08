import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InvoiceTable } from "./InvoiceTable";

describe("InvoiceTable", () => {
  it("renders empty state", () => {
    render(<InvoiceTable invoices={[]} />);
    expect(screen.getByTestId("invoice-table-empty")).toBeInTheDocument();
  });

  it("renders rows", () => {
    render(
      <InvoiceTable
        invoices={[
          {
            id: "inv_1",
            tenantId: "tenant-a",
            subscriptionId: "sub_1",
            amount: 1900,
            currency: "AUD",
            status: "paid",
            periodStart: "2026-05-08T00:00:00Z",
            periodEnd: "2026-06-07T00:00:00Z",
            createdAt: "2026-05-08T00:00:00Z",
          },
        ]}
      />,
    );
    expect(screen.getByTestId("invoice-row-inv_1")).toBeInTheDocument();
    expect(screen.getByTestId("invoice-status-paid")).toBeInTheDocument();
  });
});
