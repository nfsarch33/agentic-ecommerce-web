"use client";

import { useEffect, useState, useMemo, useCallback } from "react";

export interface PaymentRecord {
  readonly payment_id: string;
  readonly tenant_id: string;
  readonly order_id: string;
  readonly provider: "stripe" | "alipay" | "wechat" | "paypal";
  readonly status: "pending" | "succeeded" | "failed" | "refunded";
  readonly amount_cents: number;
  readonly currency: string;
  readonly created_at: string;
}

export interface PaymentDashboardProps {
  readonly tenantId?: string;
  readonly fetchImpl?: typeof fetch;
}

type Phase = "loading" | "ready" | "error";

const PROVIDER_ICONS: Record<string, string> = {
  stripe: "💳",
  alipay: "🔵",
  wechat: "🟢",
  paypal: "🅿️",
};

const STATUS_CLASSES: Record<string, string> = {
  succeeded: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  failed: "bg-red-100 text-red-800",
  refunded: "bg-gray-100 text-gray-800",
};

function formatAmount(cents: number, currency: string): string {
  const amount = cents / 100;
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency || "AUD",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function PaymentDashboard({
  tenantId,
  fetchImpl,
}: PaymentDashboardProps) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [payments, setPayments] = useState<readonly PaymentRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [providerFilter, setProviderFilter] = useState("");

  const fetcher = useMemo(
    () => fetchImpl ?? (typeof fetch !== "undefined" ? fetch : undefined),
    [fetchImpl],
  );

  const loadPayments = useCallback(async () => {
    if (!fetcher) {
      setPhase("error");
      setErrorMessage("fetch unavailable");
      return;
    }
    try {
      const params = new URLSearchParams();
      if (tenantId) params.set("tenant_id", tenantId);
      if (statusFilter) params.set("status", statusFilter);
      if (providerFilter) params.set("provider", providerFilter);
      const response = await fetcher(`/api/payments?${params.toString()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = (await response.json()) as {
        payments: PaymentRecord[];
        total: number;
      };
      setPayments(body.payments ?? []);
      setTotal(body.total ?? 0);
      setPhase("ready");
    } catch (err) {
      setPhase("error");
      setErrorMessage(err instanceof Error ? err.message : "unknown");
    }
  }, [fetcher, tenantId, statusFilter, providerFilter]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadPayments();
    });
  }, [loadPayments]);

  if (phase === "loading") {
    return (
      <div className="flex items-center justify-center py-20" role="status" aria-label="Loading payments">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center" role="alert">
        <p className="text-red-700">Failed to load payments: {errorMessage}</p>
        <button
          onClick={() => void loadPayments()}
          className="mt-3 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={providerFilter}
          onChange={(e) => {
            setPhase("loading");
            setProviderFilter(e.target.value);
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          aria-label="Filter by provider"
        >
          <option value="">All providers</option>
          <option value="stripe">Stripe</option>
          <option value="alipay">Alipay</option>
          <option value="wechat">WeChat Pay</option>
          <option value="paypal">PayPal</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setPhase("loading");
            setStatusFilter(e.target.value);
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="succeeded">Succeeded</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
        <span className="ml-auto self-center text-sm text-gray-500">
          {total} payment{total !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Provider</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Payment ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Order</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                  No payments found
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.payment_id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <span className="mr-1">{PROVIDER_ICONS[p.provider] ?? "💰"}</span>
                    <span className="capitalize">{p.provider}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-600">
                    {p.payment_id}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                    {p.order_id}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[p.status] ?? "bg-gray-100 text-gray-800"}`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium">
                    {formatAmount(p.amount_cents, p.currency)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {new Date(p.created_at).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
