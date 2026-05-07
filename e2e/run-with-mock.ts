const product = {
  id: "018f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c",
  sku: "BAND-001",
  title: "Resistance Band Set",
  slug: "resistance-band-set",
  price: { amount: 2495, currency: "AUD" },
  stock: 12,
  status: "active",
  description: "Progressive resistance band set with 5 tension levels.",
  created_at: "2026-05-07T00:00:00Z",
  updated_at: "2026-05-07T00:00:00Z",
};

const orderId = "318f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c";
const orders = new Map<string, unknown>();
const syncConflict = {
  id: "418f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c",
  product_id: product.id,
  sku: product.sku,
  remote_id: 44,
  status: "pending",
  fields: [
    { field: "title", local_value: "Resistance Band Set", remote_value: "Resistance Band Pro" },
    { field: "stock", local_value: "12", remote_value: "7" },
  ],
  created_at: "2026-05-07T00:05:00Z",
} as {
  id: string;
  product_id: string;
  sku: string;
  remote_id: number;
  status: "pending" | "resolved";
  fields: Array<{ field: string; local_value: string; remote_value: string }>;
  resolution?: "local" | "remote" | "manual";
  created_at: string;
  resolved_at?: string;
};

const aiSuggestion = {
  id: "618f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c",
  product_id: product.id,
  description: "Train anywhere with a durable five-band set designed for progressive resistance.",
  status: "generated",
  quality_score: {
    overall: 84,
    readability: 82,
    seo: 78,
    tone: 90,
    length: 80,
    factual: 88,
    notes: ["Clear benefit-led opening"],
  },
  created_at: "2026-05-07T00:08:00Z",
  model: "minimax-text-01",
};

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type,accept",
};

function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...corsHeaders,
      ...init.headers,
    },
  });
}

async function createOrder(req: Request): Promise<Response> {
  const body = (await req.json()) as {
    customer_email?: string;
    shipping_address?: unknown;
    items?: Array<{
      product_id?: string;
      sku?: string;
      title?: string;
      quantity?: number;
      unit_price?: { amount?: number; currency?: string };
    }>;
  };
  const item = body.items?.[0] ?? {};
  const amount = item.unit_price?.amount ?? product.price.amount;
  const currency = item.unit_price?.currency ?? product.price.currency;
  const quantity = item.quantity ?? 1;
  const order = {
    id: orderId,
    customer_email: body.customer_email ?? "shopper@example.com",
    items: [
      {
        product_id: item.product_id ?? product.id,
        sku: item.sku ?? product.sku,
        title: item.title ?? product.title,
        quantity,
        unit_price: { amount, currency },
        line_total: { amount: amount * quantity, currency },
      },
    ],
    status: "pending",
    totals: {
      subtotal: { amount: amount * quantity, currency },
      shipping: { amount: 0, currency },
      total: { amount: amount * quantity, currency },
    },
    shipping_address: body.shipping_address,
    created_at: "2026-05-07T00:00:00Z",
    updated_at: "2026-05-07T00:00:00Z",
  };
  orders.set(orderId, order);
  return json(order, { status: 201 });
}

const apiPort = Number(process.env.E2E_MOCK_API_PORT ?? 18080);
const server = Bun.serve({
  port: apiPort,
  hostname: "127.0.0.1",
  async fetch(req) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (url.pathname === "/healthz") return json({ status: "ok" });
    if (url.pathname === "/api/v1/products" && req.method === "GET") {
      return json({ products: [product], total: 1, page: 1, per_page: 20 });
    }
    if (url.pathname === "/api/v1/products/resistance-band-set" && req.method === "GET") {
      return json(product);
    }
    if (url.pathname === `/api/v1/products/${product.id}` && req.method === "GET") {
      return json(product);
    }
    if (url.pathname === `/api/v1/products/${product.id}/ai-suggestions` && req.method === "GET") {
      return json({ suggestions: [aiSuggestion] });
    }
    if (url.pathname === `/api/v1/products/${product.id}/generate-description` && req.method === "POST") {
      return json({
        suggestion: {
          ...aiSuggestion,
          id: "718f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c",
          description: "Fresh AI copy focused on ecommerce conversion and practical home workouts.",
          created_at: "2026-05-07T00:12:00Z",
        },
      });
    }
    if (url.pathname === "/api/v1/sync/status" && req.method === "GET") {
      return json({
        total_events: 3,
        pending_conflicts: syncConflict.status === "pending" ? 1 : 0,
        last_event: {
          id: "518f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c",
          type: "conflict_detected",
          product_id: product.id,
          remote_id: syncConflict.remote_id,
          created_at: "2026-05-07T00:05:00Z",
        },
        updated_at: "2026-05-07T00:06:00Z",
      });
    }
    if (url.pathname === "/api/v1/sync/conflicts" && req.method === "GET") {
      return json({ conflicts: [syncConflict] });
    }
    if (url.pathname === `/api/v1/sync/conflicts/${syncConflict.id}/resolve` && req.method === "POST") {
      const body = (await req.json()) as { resolution?: "local" | "remote" | "manual" };
      syncConflict.status = "resolved";
      syncConflict.resolution = body.resolution ?? "manual";
      syncConflict.resolved_at = "2026-05-07T00:10:00Z";
      return json(syncConflict);
    }
    if (url.pathname === "/api/v1/orders" && req.method === "POST") {
      return createOrder(req);
    }
    if (url.pathname === `/api/v1/orders/${orderId}` && req.method === "GET") {
      return json(
        orders.get(orderId) ?? {
          id: orderId,
          customer_email: "shopper@example.com",
          items: [],
          status: "pending",
          totals: {
            subtotal: { amount: 0, currency: "AUD" },
            shipping: { amount: 0, currency: "AUD" },
            total: { amount: 0, currency: "AUD" },
          },
          shipping_address: {
            name: "Jane Shopper",
            line1: "1 Market Street",
            city: "Sydney",
            region: "NSW",
            postal_code: "2000",
            country: "AU",
          },
          created_at: "2026-05-07T00:00:00Z",
          updated_at: "2026-05-07T00:00:00Z",
        },
      );
    }
    return json({ error: "not_found" }, { status: 404 });
  },
});

const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
const next = Bun.spawn(["bun", "run", "dev"], {
  stdout: "inherit",
  stderr: "inherit",
  stdin: "inherit",
  env: {
    ...process.env,
    MC_API_BASE_URL: apiBaseUrl,
    NEXT_PUBLIC_MC_API_BASE_URL: apiBaseUrl,
  },
});

function shutdown() {
  server.stop(true);
  next.kill();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

const exitCode = await next.exited;
server.stop(true);
process.exit(exitCode);
