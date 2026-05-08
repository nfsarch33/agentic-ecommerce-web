import { describe, expect, it, vi } from "vitest";
import {
  BillingApiError,
  cancelBillingSubscription,
  getBillingInvoice,
  getBillingSubscription,
  getBillingUsage,
  listBillingInvoices,
  listBillingSubscriptions,
  parseInvoice,
  parseSubscription,
  pauseBillingSubscription,
  resumeBillingSubscription,
} from "./billing";

const okHeaders = new Headers({ "content-type": "application/json" });

const subscriptionFixture = {
  id: "sub_1",
  tenant_id: "tenant-a",
  plan_id: "starter",
  state: "active",
  stripe_subscription_id: "sub_stripe_1",
  stripe_customer_id: "cus_1",
  current_period_start: "2026-05-08T00:00:00Z",
  current_period_end: "2026-06-07T00:00:00Z",
  cancel_at_period_end: false,
  created_at: "2026-05-08T00:00:00Z",
  updated_at: "2026-05-08T00:00:00Z",
};

const invoiceFixture = {
  id: "inv_1",
  tenant_id: "tenant-a",
  subscription_id: "sub_1",
  amount: 1900,
  currency: "AUD",
  status: "paid",
  period_start: "2026-05-08T00:00:00Z",
  period_end: "2026-06-07T00:00:00Z",
  created_at: "2026-05-08T00:00:00Z",
};

describe("billing adapter", () => {
  it("listBillingSubscriptions parses pagination", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({ subscriptions: [subscriptionFixture], total: 1 }),
        { status: 200, headers: okHeaders },
      ),
    );
    const out = await listBillingSubscriptions({
      baseUrl: "http://localhost:8080",
      tenantId: "tenant-a",
      page: 2,
      perPage: 10,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(out.subscriptions).toHaveLength(1);
    expect(out.total).toBe(1);
    expect(out.page).toBe(2);
    expect(out.subscriptions[0]?.state).toBe("active");
  });

  it("listBillingSubscriptions throws on non-array", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ subscriptions: "nope", total: 0 }), {
        status: 200,
        headers: okHeaders,
      }),
    );
    await expect(
      listBillingSubscriptions({
        baseUrl: "http://localhost:8080",
        tenantId: "tenant-a",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toBeInstanceOf(BillingApiError);
  });

  it("getBillingSubscription parses a single row", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify(subscriptionFixture), { status: 200, headers: okHeaders }),
    );
    const out = await getBillingSubscription({
      baseUrl: "http://localhost:8080",
      tenantId: "tenant-a",
      id: "sub_1",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(out.id).toBe("sub_1");
  });

  it("transition helpers POST", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ ...subscriptionFixture, state: "paused" }), { status: 200, headers: okHeaders }),
    );
    const opts = {
      baseUrl: "http://localhost:8080",
      tenantId: "tenant-a",
      id: "sub_1",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    };
    expect((await pauseBillingSubscription(opts)).state).toBe("paused");
    expect((await resumeBillingSubscription({ ...opts, fetchImpl: vi.fn(async () =>
      new Response(JSON.stringify({ ...subscriptionFixture, state: "active" }), { status: 200, headers: okHeaders }),
    ) as unknown as typeof fetch })).state).toBe("active");
    expect(
      (await cancelBillingSubscription({ ...opts, fetchImpl: vi.fn(async () =>
        new Response(JSON.stringify({ ...subscriptionFixture, state: "canceled" }), { status: 200, headers: okHeaders }),
      ) as unknown as typeof fetch })).state,
    ).toBe("canceled");
  });

  it("listBillingInvoices and getBillingInvoice", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({ invoices: [invoiceFixture], total: 1 }),
        { status: 200, headers: okHeaders },
      ),
    );
    const list = await listBillingInvoices({
      baseUrl: "http://localhost:8080",
      tenantId: "tenant-a",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(list.invoices[0]?.id).toBe("inv_1");
    const single = await getBillingInvoice({
      baseUrl: "http://localhost:8080",
      tenantId: "tenant-a",
      id: "inv_1",
      fetchImpl: vi.fn(async () =>
        new Response(JSON.stringify(invoiceFixture), { status: 200, headers: okHeaders }),
      ) as unknown as typeof fetch,
    });
    expect(single.amount).toBe(1900);
  });

  it("getBillingUsage parses rollups", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          tenant_id: "tenant-a",
          plan: "starter",
          period_start: "2026-05-01T00:00:00Z",
          period_end: "2026-06-01T00:00:00Z",
          rollups: [
            { metric: "api.requests", value: 10, limit: 100 },
            { metric: "agent.runs", value: 1, limit: 50 },
          ],
        }),
        { status: 200, headers: okHeaders },
      ),
    );
    const out = await getBillingUsage({
      baseUrl: "http://localhost:8080",
      tenantId: "tenant-a",
      plan: "starter",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(out.rollups).toHaveLength(2);
  });

  it("HTTP error becomes BillingApiError", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 500 }));
    await expect(
      listBillingSubscriptions({
        baseUrl: "http://localhost:8080",
        tenantId: "tenant-a",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toBeInstanceOf(BillingApiError);
  });

  it("parseSubscription throws on bad state", () => {
    expect(() => parseSubscription({ ...subscriptionFixture, state: "garbage" })).toThrow();
  });

  it("parseInvoice throws on bad status", () => {
    expect(() => parseInvoice({ ...invoiceFixture, status: "garbage" })).toThrow();
  });

  it("missing baseUrl throws", async () => {
    await expect(
      listBillingSubscriptions({
        baseUrl: "",
        tenantId: "tenant-a",
        fetchImpl: vi.fn() as unknown as typeof fetch,
      }),
    ).rejects.toBeInstanceOf(BillingApiError);
  });

  it("missing id throws", async () => {
    await expect(
      pauseBillingSubscription({
        baseUrl: "http://x",
        tenantId: "tenant-a",
        id: "",
        fetchImpl: vi.fn() as unknown as typeof fetch,
      }),
    ).rejects.toBeInstanceOf(BillingApiError);
  });
});
