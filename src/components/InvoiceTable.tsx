import type { Invoice } from "@/lib/domain/billing";
import { formatMoneyMinor } from "@/lib/domain/billing";

const STATUS_TONE: Record<Invoice["status"], string> = {
  open: "bg-slate-50 text-slate-700 ring-slate-600/20",
  paid: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  void: "bg-amber-50 text-amber-800 ring-amber-600/20",
  uncollectible: "bg-rose-50 text-rose-800 ring-rose-600/20",
};

export interface InvoiceTableProps {
  readonly invoices: readonly Invoice[];
}

export function InvoiceTable({ invoices }: InvoiceTableProps) {
  if (invoices.length === 0) {
    return (
      <p className="text-sm text-slate-500" data-testid="invoice-table-empty">
        No invoices yet.
      </p>
    );
  }
  return (
    <table className="w-full text-left text-sm" data-testid="invoice-table">
      <thead>
        <tr className="border-b border-slate-200 text-slate-500">
          <th className="py-2 pr-4 font-medium">Invoice</th>
          <th className="py-2 pr-4 font-medium">Period</th>
          <th className="py-2 pr-4 font-medium">Amount</th>
          <th className="py-2 pr-4 font-medium">Status</th>
        </tr>
      </thead>
      <tbody>
        {invoices.map((inv) => (
          <tr key={inv.id} className="border-b border-slate-100" data-testid={`invoice-row-${inv.id}`}>
            <td className="py-2 pr-4 font-mono text-xs">{inv.id}</td>
            <td className="py-2 pr-4 text-slate-600">
              {inv.periodStart.slice(0, 10)} → {inv.periodEnd.slice(0, 10)}
            </td>
            <td className="py-2 pr-4 font-medium">{formatMoneyMinor(inv.amount, inv.currency)}</td>
            <td className="py-2 pr-4">
              <span
                className={[
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
                  STATUS_TONE[inv.status],
                ].join(" ")}
                data-testid={`invoice-status-${inv.status}`}
              >
                {inv.status}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
