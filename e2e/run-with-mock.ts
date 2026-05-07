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
const authSessions = new Map<
  string,
  { user: { id: string; email: string; role: "admin" | "operator" | "viewer" }; expires_at: string }
>();
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

const evidenceSource = {
  id: "ev_resistance_band_manual",
  title: "Resistance Band Product Manual",
  uri: "s3://rag-docs/resistance-band-manual.md",
  excerpt: "The set includes five latex bands with progressive tension levels.",
  similarity: 0.91,
  source_type: "manual",
  metadata: { page: 2, section: "Specifications" },
};

const factCheckResult = {
  id: "fc_ai_content_1",
  product_id: product.id,
  suggestion_id: "718f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c",
  overall_confidence: 86,
  status: "supported",
  checked_at: "2026-05-08T01:00:00Z",
  claims: [
    {
      id: "claim_tension_levels",
      text: "The set includes five tension levels.",
      confidence: 92,
      verdict: "supported",
      evidence: [evidenceSource],
      explanation: "Product manual confirms the five-level resistance claim.",
    },
    {
      id: "claim_warranty_coverage",
      text: "Warranty coverage is available.",
      confidence: 46,
      verdict: "ambiguous",
      evidence: [],
      explanation: "No warranty document was returned for this claim.",
    },
  ],
};

const complianceRule = {
  id: "prohibited_words",
  description: "Product copy must avoid unsupported superlatives.",
  severity: "critical",
};

const complianceResult = {
  product_id: product.id,
  pass: false,
  score: 62,
  reasons: ["Title claims the product is guaranteed to cure pain."],
  rule_ids: ["prohibited_words", "seo_minimum_score"],
  severity: "critical",
  results: [
    {
      id: "prohibited_words",
      pass: false,
      score: 0,
      severity: "critical",
      reasons: ["Title claims the product is guaranteed to cure pain."],
    },
    {
      id: "seo_minimum_score",
      pass: false,
      score: 71,
      severity: "error",
      reasons: ["seo score below minimum"],
    },
  ],
};

const passingComplianceResult = {
  product_id: product.id,
  pass: true,
  score: 96,
  reasons: [],
  rule_ids: ["prohibited_words", "seo_minimum_score"],
  severity: "info",
  results: [
    {
      id: "prohibited_words",
      pass: true,
      score: 100,
      severity: "info",
      reasons: [],
    },
    {
      id: "seo_minimum_score",
      pass: true,
      score: 96,
      severity: "info",
      reasons: [],
    },
  ],
};

const agentSummary = {
  id: "agent_sourcing",
  kind: "sourcing",
  name: "Sourcing Agent",
  description: "Finds supplier opportunities from configured feeds.",
  status: "running",
  last_run_at: "2026-05-07T04:20:00Z",
  next_run_at: "2026-05-07T05:00:00Z",
  last_run_status: "succeeded",
  in_flight_runs: 1,
  queued_runs: 2,
  success_rate: 0.82,
  updated_at: "2026-05-07T04:31:00Z",
} as {
  id: string;
  kind: "sourcing";
  name: string;
  description: string;
  status: "idle" | "queued" | "running" | "succeeded" | "failed" | "disabled";
  last_run_at: string;
  next_run_at: string;
  last_run_status: "succeeded";
  in_flight_runs: number;
  queued_runs: number;
  success_rate: number;
  updated_at: string;
};

type MockAgentRun = {
  id: string;
  agent_id: string;
  status: "idle" | "queued" | "running" | "succeeded" | "failed" | "disabled";
  trigger: "manual" | "scheduled" | "event";
  started_at?: string;
  finished_at?: string;
  duration_ms?: number;
  summary?: string;
  input?: unknown;
  output?: unknown;
  created_at: string;
};

const agentRun: MockAgentRun = {
  id: "run_1",
  agent_id: agentSummary.id,
  status: "succeeded",
  trigger: "manual",
  started_at: "2026-05-07T04:20:00Z",
  finished_at: "2026-05-07T04:21:30Z",
  duration_ms: 90000,
  summary: "Found three supplier candidates.",
  input: { category: "fitness" },
  output: { candidates: 3 },
  created_at: "2026-05-07T04:20:00Z",
};
const agentRuns: MockAgentRun[] = [agentRun];
const recentEvents = [
  {
    id: "evt_compliance_1",
    type: "compliance.checked",
    severity: "warning",
    message: "Compliance check needs review",
    occurred_at: "2026-05-07T04:35:00Z",
    metadata: { tenant_id: "default", source: "mc-api" },
  },
  {
    id: "evt_product_1",
    type: "product.created",
    severity: "info",
    message: "Product was created",
    occurred_at: "2026-05-07T04:30:00Z",
    metadata: { tenant_id: "default", source: "mc-api" },
  },
] as const;

type MockWorkflow = {
  id: string;
  type: "product_publish";
  status: "queued" | "running" | "waiting_review" | "completed" | "failed" | "cancelled";
  product_id: string;
  product_title: string;
  current_activity?: string;
  started_at: string;
  updated_at: string;
  completed_at?: string;
  error?: string;
  activities: Array<{
    id: string;
    name: string;
    status: "pending" | "running" | "waiting_review" | "completed" | "failed" | "skipped";
    started_at?: string;
    completed_at?: string;
    message?: string;
    attempt?: number;
    error?: string;
  }>;
};

const workflowDetail: MockWorkflow = {
  id: "wf_product_publish_1",
  type: "product_publish",
  status: "waiting_review",
  product_id: product.id,
  product_title: product.title,
  current_activity: "Human review",
  started_at: "2026-05-07T04:40:00Z",
  updated_at: "2026-05-07T04:42:00Z",
  activities: [
    {
      id: "act_compliance",
      name: "Check compliance",
      status: "completed",
      started_at: "2026-05-07T04:40:00Z",
      completed_at: "2026-05-07T04:40:30Z",
      message: "Passed CCE checks.",
      attempt: 1,
    },
    {
      id: "act_media",
      name: "Validate media",
      status: "completed",
      started_at: "2026-05-07T04:40:30Z",
      completed_at: "2026-05-07T04:41:00Z",
      message: "Primary product media is valid.",
      attempt: 1,
    },
    {
      id: "act_review",
      name: "Human review",
      status: "waiting_review",
      started_at: "2026-05-07T04:41:00Z",
      message: "Waiting for operator approval.",
    },
  ],
};

const workflows: MockWorkflow[] = [
  workflowDetail,
  {
    ...workflowDetail,
    id: "wf_product_publish_completed",
    status: "completed",
    current_activity: "Published to WooCommerce",
    updated_at: "2026-05-07T04:20:00Z",
    completed_at: "2026-05-07T04:20:00Z",
    activities: workflowDetail.activities.map((activity) => ({
      ...activity,
      status: "completed",
      completed_at: activity.completed_at ?? "2026-05-07T04:20:00Z",
    })),
  },
  {
    ...workflowDetail,
    id: "wf_product_publish_failed",
    status: "failed",
    current_activity: "Publish to WooCommerce",
    updated_at: "2026-05-07T04:10:00Z",
    error: "WooCommerce publish failed",
    activities: [
      ...workflowDetail.activities.slice(0, 2),
      {
        id: "act_publish",
        name: "Publish to WooCommerce",
        status: "failed",
        started_at: "2026-05-07T04:09:00Z",
        completed_at: "2026-05-07T04:10:00Z",
        error: "WooCommerce publish failed",
        attempt: 2,
      },
    ],
  },
];

type MockWebhook = {
  id: string;
  url: string;
  event_types: Array<
    | "product.created"
    | "product.updated"
    | "order.placed"
    | "sync.completed"
    | "agent.run.completed"
    | "compliance.checked"
  >;
  secret_ref?: string;
  secret_hash: string;
  enabled: boolean;
  created_at: string;
};

const webhooks: MockWebhook[] = [
  {
    id: "wh_existing_order",
    url: "https://hooks.n8n.example/webhook/order-placed",
    event_types: ["order.placed"],
    secret_hash: "sha256:test",
    enabled: true,
    created_at: "2026-05-08T00:00:00Z",
  },
];

type MockMediaAsset = {
  id: string;
  product_id?: string;
  source_url?: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  width?: number;
  height?: number;
  processing_status: "sourced" | "processing" | "processed" | "validated" | "failed";
  object_store_location?: {
    provider: "local" | "s3" | "gcs";
    bucket: string;
    key: string;
    url?: string;
  };
  metadata: {
    alt_text: string;
    title: string;
    tags: string[];
  };
  qa_result?: {
    status: "pending" | "passed" | "needs_review" | "failed";
    score: number;
    checked_at: string;
    checks: Array<{
      code: string;
      status: "pending" | "passed" | "needs_review" | "failed";
      message: string;
    }>;
  };
  created_at: string;
  updated_at: string;
};

const mediaAssets: MockMediaAsset[] = [
  {
    id: "media_hero",
    product_id: product.id,
    source_url: "https://supplier.example/hero.png",
    original_filename: "hero.png",
    mime_type: "image/png",
    size_bytes: 450123,
    width: 2200,
    height: 1400,
    processing_status: "validated",
    object_store_location: {
      provider: "local",
      bucket: "media",
      key: "products/resistance-band/hero.webp",
      url: "https://cdn.example/products/resistance-band/hero.webp",
    },
    metadata: {
      alt_text: "Resistance band set with five tension levels",
      title: "Resistance band hero image",
      tags: ["fitness", "hero"],
    },
    qa_result: {
      status: "passed",
      score: 92,
      checked_at: "2026-05-08T01:00:00Z",
      checks: [
        { code: "resolution", status: "passed", message: "Image exceeds minimum resolution." },
      ],
    },
    created_at: "2026-05-08T00:00:00Z",
    updated_at: "2026-05-08T01:00:00Z",
  },
  {
    id: "media_thumb",
    product_id: product.id,
    source_url: "https://supplier.example/thumb.jpg",
    original_filename: "thumb.jpg",
    mime_type: "image/jpeg",
    size_bytes: 12000,
    width: 320,
    height: 240,
    processing_status: "failed",
    metadata: {
      alt_text: "",
      title: "Tiny supplier thumbnail",
      tags: ["supplier"],
    },
    qa_result: {
      status: "failed",
      score: 24,
      checked_at: "2026-05-08T01:00:00Z",
      checks: [{ code: "resolution", status: "failed", message: "Image is below 1200px wide." }],
    },
    created_at: "2026-05-08T00:00:00Z",
    updated_at: "2026-05-08T01:00:00Z",
  },
];

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
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

async function login(req: Request): Promise<Response> {
  const body = (await req.json()) as { email?: string };
  const email = body.email ?? "viewer@example.com";
  const role = email.startsWith("admin")
    ? "admin"
    : email.startsWith("operator")
      ? "operator"
      : "viewer";
  const token = `${role}-token`;
  const session = {
    user: { id: `user_${role}`, email, role },
    expires_at: "2026-05-07T10:00:00Z",
  };
  authSessions.set(token, session);
  return json({ access_token: token, session });
}

function sessionFromAuthorization(req: Request): Response {
  const authorization = req.headers.get("authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  const session = authSessions.get(token);
  if (!session) {
    return json({ error: "unauthenticated" }, { status: 401 });
  }
  return json(session);
}

function workflowSummary(workflow: MockWorkflow): Omit<MockWorkflow, "activities"> {
  return {
    id: workflow.id,
    type: workflow.type,
    status: workflow.status,
    product_id: workflow.product_id,
    product_title: workflow.product_title,
    current_activity: workflow.current_activity,
    started_at: workflow.started_at,
    updated_at: workflow.updated_at,
    completed_at: workflow.completed_at,
    error: workflow.error,
  };
}

const apiPort = Number(process.env.E2E_MOCK_API_PORT ?? 18080);
const releaseFlowMode = process.env.E2E_RELEASE_FLOW === "true";
const server = Bun.serve({
  port: apiPort,
  hostname: "127.0.0.1",
  async fetch(req) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (url.pathname === "/healthz") return json({ status: "ok" });
    if (url.pathname === "/api/v1/auth/login" && req.method === "POST") {
      return login(req);
    }
    if (url.pathname === "/api/v1/auth/me" && req.method === "GET") {
      return sessionFromAuthorization(req);
    }
    if (url.pathname === "/api/v1/auth/logout" && req.method === "POST") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
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
    if (
      url.pathname === `/api/v1/products/${product.id}/generate-description` &&
      req.method === "POST"
    ) {
      return json({
        suggestion: {
          ...aiSuggestion,
          id: "718f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c",
          description: "Fresh AI copy focused on ecommerce conversion and practical home workouts.",
          created_at: "2026-05-07T00:12:00Z",
          fact_check_result: factCheckResult,
        },
      });
    }
    if (
      url.pathname === `/api/v1/products/${product.id}/fact-check-results/latest` &&
      req.method === "GET"
    ) {
      return json({ result: factCheckResult });
    }
    if (url.pathname === "/api/v1/rag/search" && req.method === "GET") {
      return json({ query: url.searchParams.get("q") ?? "", results: [evidenceSource] });
    }
    if (url.pathname === "/api/v1/rag/evidence/search" && req.method === "POST") {
      return json({ sources: [evidenceSource] });
    }
    if (url.pathname === "/api/v1/webhooks" && req.method === "GET") {
      return json({ webhooks });
    }
    if (url.pathname === "/api/v1/webhooks" && req.method === "POST") {
      const body = (await req.json()) as {
        url?: string;
        event_types?: MockWebhook["event_types"];
        secret?: string;
      };
      const webhook: MockWebhook = {
        id: `wh_${webhooks.length + 1}`,
        url: body.url ?? "https://hooks.n8n.example/webhook/product-created",
        event_types: body.event_types ?? ["product.created"],
        secret_hash: body.secret ? "sha256:test" : "",
        enabled: true,
        created_at: "2026-05-08T00:05:00Z",
      };
      webhooks.unshift(webhook);
      return json(webhook, { status: 201 });
    }
    if (
      url.pathname.startsWith("/api/v1/webhooks/") &&
      url.pathname.endsWith("/test") &&
      req.method === "POST"
    ) {
      const webhookId = decodeURIComponent(
        url.pathname.replace("/api/v1/webhooks/", "").replace("/test", ""),
      );
      const webhook = webhooks.find((candidate) => candidate.id === webhookId);
      if (!webhook) return json({ error: "not_found" }, { status: 404 });
      const body = (await req.json()) as { event_type?: MockWebhook["event_types"][number] };
      return json(
        {
          delivery: {
            id: `del_${webhook.id}`,
            webhook_id: webhook.id,
            event_id: "evt_test",
            event_type: body.event_type ?? webhook.event_types[0],
            success: true,
            status: 204,
            attempts: 1,
            created_at: "2026-05-08T00:06:00Z",
          },
        },
        { status: 202 },
      );
    }
    if (url.pathname.startsWith("/api/v1/webhooks/") && req.method === "DELETE") {
      const webhookId = decodeURIComponent(url.pathname.replace("/api/v1/webhooks/", ""));
      const index = webhooks.findIndex((candidate) => candidate.id === webhookId);
      if (index === -1) return json({ error: "not_found" }, { status: 404 });
      webhooks.splice(index, 1);
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (url.pathname === "/api/v1/workflows" && req.method === "GET") {
      const status = url.searchParams.get("status");
      const limit = Number(url.searchParams.get("limit") ?? "50");
      const list = status ? workflows.filter((workflow) => workflow.status === status) : workflows;
      return json({ workflows: list.slice(0, limit).map(workflowSummary) });
    }
    if (url.pathname === "/api/v1/workflows/product-publish" && req.method === "POST") {
      const body = (await req.json()) as { product_id?: string; description?: string };
      const workflow: MockWorkflow = {
        ...workflowDetail,
        id: `wf_product_publish_${workflows.length + 1}`,
        status: "running",
        product_id: body.product_id ?? product.id,
        product_title: product.title,
        current_activity: "Check compliance",
        started_at: "2026-05-07T04:50:00Z",
        updated_at: "2026-05-07T04:50:00Z",
        activities: [
          {
            id: "act_compliance_new",
            name: "Check compliance",
            status: "running",
            started_at: "2026-05-07T04:50:00Z",
            message: body.description
              ? "Checking operator-approved copy."
              : "Checking product copy.",
            attempt: 1,
          },
        ],
      };
      workflows.unshift(workflow);
      return json({ workflow: workflowSummary(workflow) }, { status: 202 });
    }
    if (url.pathname.startsWith("/api/v1/workflows/") && req.method === "GET") {
      const workflowId = decodeURIComponent(url.pathname.replace("/api/v1/workflows/", ""));
      const workflow = workflows.find((candidate) => candidate.id === workflowId);
      return workflow ? json(workflow) : json({ error: "not_found" }, { status: 404 });
    }
    if (url.pathname.endsWith("/signals/review") && req.method === "POST") {
      const workflowId = decodeURIComponent(
        url.pathname.replace("/api/v1/workflows/", "").replace("/signals/review", ""),
      );
      const workflow = workflows.find((candidate) => candidate.id === workflowId);
      if (!workflow) return json({ error: "not_found" }, { status: 404 });
      workflow.status = "completed";
      workflow.current_activity = "Published to WooCommerce";
      workflow.updated_at = "2026-05-07T04:55:00Z";
      workflow.completed_at = "2026-05-07T04:55:00Z";
      workflow.activities = workflow.activities.map((activity) =>
        activity.status === "waiting_review"
          ? { ...activity, status: "completed", completed_at: "2026-05-07T04:55:00Z" }
          : activity,
      );
      return json({ workflow: workflowSummary(workflow) }, { status: 202 });
    }
    if (url.pathname === "/api/v1/media" && req.method === "GET") {
      const productId = url.searchParams.get("product_id");
      const status = url.searchParams.get("status");
      const list = mediaAssets.filter((asset) => {
        if (productId && asset.product_id !== productId) return false;
        if (status && asset.processing_status !== status) return false;
        return true;
      });
      return json({ assets: list });
    }
    if (url.pathname === "/api/v1/media/source" && req.method === "POST") {
      const body = (await req.json()) as {
        url?: string;
        alt_text?: string;
        source_url?: string;
        product_id?: string;
        file?: { name?: string; type?: string; size?: number };
        metadata?: { alt_text?: string; title?: string; tags?: string[] };
      };
      const sourceURL = body.url ?? body.source_url;
      const filename = body.file?.name ?? sourceURL?.split("/").pop() ?? "sourced-media.png";
      const asset: MockMediaAsset = {
        id: `media_${mediaAssets.length + 1}`,
        product_id: body.product_id,
        source_url: sourceURL,
        original_filename: filename,
        mime_type: body.file?.type ?? "image/png",
        size_bytes: body.file?.size ?? 180000,
        width: 1600,
        height: 1200,
        processing_status: "sourced",
        object_store_location: {
          provider: "local",
          bucket: "media",
          key: `products/${body.product_id ?? "library"}/${filename}`,
          url: sourceURL,
        },
        metadata: {
          alt_text: body.alt_text ?? body.metadata?.alt_text ?? "",
          title: body.metadata?.title ?? filename,
          tags: body.metadata?.tags ?? [],
        },
        qa_result: {
          status: "pending",
          score: 0,
          checked_at: "2026-05-08T01:05:00Z",
          checks: [{ code: "queued", status: "pending", message: "Media QA has not run yet." }],
        },
        created_at: "2026-05-08T01:05:00Z",
        updated_at: "2026-05-08T01:05:00Z",
      };
      mediaAssets.unshift(asset);
      return json({ asset }, { status: 202 });
    }
    if (url.pathname === "/api/v1/media/process" && req.method === "POST") {
      const body = (await req.json()) as { media_id?: string };
      const asset = mediaAssets.find((candidate) => candidate.id === body.media_id);
      if (!asset) return json({ error: "not_found" }, { status: 404 });
      asset.processing_status = "processed";
      asset.updated_at = "2026-05-08T01:07:00Z";
      return json({ asset }, { status: 202 });
    }
    if (
      url.pathname.startsWith("/api/v1/media/") &&
      url.pathname.endsWith("/validate") &&
      req.method === "POST"
    ) {
      const mediaId = decodeURIComponent(
        url.pathname.replace("/api/v1/media/", "").replace("/validate", ""),
      );
      const asset = mediaAssets.find((candidate) => candidate.id === mediaId);
      if (!asset) return json({ error: "not_found" }, { status: 404 });
      asset.processing_status = "validated";
      asset.qa_result = {
        status: "passed",
        score: 94,
        checked_at: "2026-05-08T01:08:00Z",
        checks: [{ code: "resolution", status: "passed", message: "Media passed validation." }],
      };
      asset.updated_at = "2026-05-08T01:08:00Z";
      return json({ asset });
    }
    if (
      url.pathname.startsWith("/api/v1/media/") &&
      url.pathname.endsWith("/metadata") &&
      req.method === "PATCH"
    ) {
      const mediaId = decodeURIComponent(
        url.pathname.replace("/api/v1/media/", "").replace("/metadata", ""),
      );
      const asset = mediaAssets.find((candidate) => candidate.id === mediaId);
      if (!asset) return json({ error: "not_found" }, { status: 404 });
      const body = (await req.json()) as {
        metadata?: { alt_text?: string; title?: string; tags?: string[] };
      };
      asset.metadata = {
        alt_text: body.metadata?.alt_text ?? asset.metadata.alt_text,
        title: body.metadata?.title ?? asset.metadata.title,
        tags: body.metadata?.tags ?? asset.metadata.tags,
      };
      asset.updated_at = "2026-05-08T01:09:00Z";
      return json({ asset });
    }
    if (url.pathname.startsWith("/api/v1/media/") && req.method === "GET") {
      const mediaId = decodeURIComponent(url.pathname.replace("/api/v1/media/", ""));
      const asset = mediaAssets.find((candidate) => candidate.id === mediaId);
      return asset ? json(asset) : json({ error: "not_found" }, { status: 404 });
    }
    if (url.pathname === "/api/v1/compliance/rules" && req.method === "GET") {
      return json({ rules: [complianceRule] });
    }
    if (
      url.pathname === `/api/v1/products/${product.id}/compliance-check` &&
      req.method === "POST"
    ) {
      return json(releaseFlowMode ? passingComplianceResult : complianceResult);
    }
    if (
      url.pathname === `/api/v1/products/${product.id}/seo-suggestions` &&
      req.method === "POST"
    ) {
      return json({
        product_id: product.id,
        title: "Resistance Band Set for Home Workouts",
        meta_description:
          "Resistance band set for home workouts and progressive strength training.",
        slug: "resistance-band-set",
        score: 71,
        keyword_density: { "resistance band set": 10.71 },
        pass: false,
        reasons: ["seo score below minimum"],
      });
    }
    if (url.pathname === "/api/v1/agents" && req.method === "GET") {
      return json({ agents: [agentSummary] });
    }
    if (url.pathname === "/api/v1/events/recent" && req.method === "GET") {
      const limit = Number(url.searchParams.get("limit") ?? "20");
      return json({ events: recentEvents.slice(0, limit) });
    }
    if (url.pathname === `/api/v1/agents/${agentSummary.id}/history` && req.method === "GET") {
      return json({ runs: agentRuns });
    }
    if (url.pathname === `/api/v1/agents/${agentSummary.id}/run` && req.method === "POST") {
      const nextRun = {
        ...agentRun,
        id: `run_${agentRuns.length + 1}`,
        status: "queued",
        trigger: "manual",
        started_at: undefined,
        finished_at: undefined,
        duration_ms: undefined,
        summary: "Manual run queued by operator.",
        output: undefined,
        created_at: "2026-05-07T04:32:00Z",
      };
      agentSummary.queued_runs += 1;
      agentSummary.status = "queued";
      agentRuns.unshift(nextRun);
      return json({ run: nextRun }, { status: 202 });
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
    if (
      url.pathname === `/api/v1/sync/conflicts/${syncConflict.id}/resolve` &&
      req.method === "POST"
    ) {
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
    NEXT_PUBLIC_N8N_URL: process.env.NEXT_PUBLIC_N8N_URL ?? "https://n8n.example.com",
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
