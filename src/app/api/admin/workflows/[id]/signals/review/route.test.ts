import { afterEach, describe, expect, it, vi } from "vitest";
import * as http from "node:http";
import { POST } from "./route";

// The route is tested against a REAL local HTTP server: the session fetch
// and the signal POST both go through the real adapters and the real
// global fetch, so the captured request bytes are exactly what production
// sends. No component or fetch stub sits in between.

interface Captured {
  url: string;
  method: string;
  body: Record<string, unknown>;
  contentType: string;
}

interface Upstream {
  server: http.Server;
  port: number;
  captured: Captured[];
  signalStatus: number;
  sessionStatus: number;
  close(): Promise<void>;
}

async function startUpstream(overrides: Partial<Pick<Upstream, "signalStatus" | "sessionStatus">> = {}): Promise<Upstream> {
  const upstream: Upstream = {
    server: null as unknown as http.Server,
    port: 0,
    captured: [],
    signalStatus: 202,
    sessionStatus: 200,
    ...overrides,
    close(): Promise<void> {
      return new Promise((resolve) => upstream.server.close(() => resolve()));
    },
  };
  upstream.server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk: string) => {
      raw += chunk;
    });
    req.on("end", () => {
      const url = req.url ?? "";
      if (req.method === "GET" && url.startsWith("/api/v1/auth/me")) {
        if (upstream.sessionStatus !== 200) {
          res.writeHead(upstream.sessionStatus, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: "unauthorized" }));
          return;
        }
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            user: { id: "u_1", email: "operator@example.com", role: "operator" },
            expires_at: "2026-12-31T00:00:00Z",
          }),
        );
        return;
      }
      if (req.method === "POST" && url.includes("/signals/review")) {
        upstream.captured.push({
          url,
          method: req.method ?? "",
          body: JSON.parse(raw || "{}") as Record<string, unknown>,
          contentType: String(req.headers["content-type"] ?? ""),
        });
        res.writeHead(upstream.signalStatus, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            status: "signaled",
            workflow: {
              id: "wf1", type: "product_publish", status: "completed", product_id: "p1",
              product_title: "T", current_activity: "Published",
              started_at: "2026-09-25T00:00:00Z", updated_at: "2026-09-25T01:00:00Z",
              activities: [], review: { approved: true },
            },
          }),
        );
        return;
      }
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "not_found" }));
    });
  });
  await new Promise<void>((resolve) => upstream.server.listen(0, "127.0.0.1", resolve));
  upstream.port = (upstream.server.address() as { port: number }).port;
  return upstream;
}

/** Invoke the route handler directly; Next normally supplies decoded
 * dynamic params, tests pass them explicitly. */
function callRoute(id: string, init: RequestInit): Promise<Response> {
  return POST(
    new Request(`http://web.test/api/admin/workflows/${encodeURIComponent(id)}/signals/review`, init),
    { params: Promise.resolve({ id }) },
  );
}

function signedRequest(id: string, body: unknown): Promise<Response> {
  return callRoute(id, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: "ec_session=jwt-token" },
    body: JSON.stringify(body),
  });
}

const ORIGINAL_BASE = process.env.MC_API_BASE_URL;

afterEach(() => {
  process.env.MC_API_BASE_URL = ORIGINAL_BASE;
});

describe("POST /api/admin/workflows/[id]/signals/review", () => {
  it("approve sends the generated-schema body {approved:true} through the real adapter", async () => {
    const upstream = await startUpstream();
    process.env.MC_API_BASE_URL = `http://127.0.0.1:${upstream.port}`;
    try {
      const res = await signedRequest("wf1", { signal: "approve" });
      expect(res.status).toBe(202);
      expect(upstream.captured).toHaveLength(1);
      expect(upstream.captured[0]?.method).toBe("POST");
      expect(upstream.captured[0]?.url).toBe("/api/v1/workflows/wf1/signals/review");
      expect(upstream.captured[0]?.contentType).toContain("application/json");
      // Mutant this kills: reviewSignalBody approve branch returning
      // {approved:false} (or a hand-typed {approved, text} field name).
      expect(upstream.captured[0]?.body).toEqual({ approved: true });
    } finally {
      await upstream.close();
    }
  });

  it("reject sends {approved:false, note}", async () => {
    const upstream = await startUpstream();
    process.env.MC_API_BASE_URL = `http://127.0.0.1:${upstream.port}`;
    try {
      const res = await signedRequest("wf2", {
        signal: "reject",
        note: "wrong size chart",
      });
      expect(res.status).toBe(202);
      expect(upstream.captured[0]?.body).toEqual({ approved: false, note: "wrong size chart" });
    } finally {
      await upstream.close();
    }
  });

  it("an id with / and ? is percent-encoded once in the upstream path", async () => {
    const upstream = await startUpstream();
    process.env.MC_API_BASE_URL = `http://127.0.0.1:${upstream.port}`;
    try {
      const res = await signedRequest("wf/2?x", { signal: "approve" });
      expect(res.status).toBe(202);
      // Mutant this kills: encodeURIComponent dropped in the adapter —
      // the path would arrive as /workflows/wf/2?x/signals/review.
      expect(upstream.captured[0]?.url).toBe(
        "/api/v1/workflows/wf%2F2%3Fx/signals/review",
      );
    } finally {
      await upstream.close();
    }
  });

  it("a real-adapter 409 passes through as 409 (decided elsewhere)", async () => {
    const upstream = await startUpstream({ signalStatus: 409 });
    process.env.MC_API_BASE_URL = `http://127.0.0.1:${upstream.port}`;
    try {
      const res = await signedRequest("wf1", { signal: "approve" });
      // This exercises the adapter's WorkflowsApiError with a structured
      // status; the route classifies from err.status, not from messages.
      // Mutant this kills: the 404/409 passthrough deleted → 502.
      expect(res.status).toBe(409);
    } finally {
      await upstream.close();
    }
  });

  it("an upstream 500 maps to 502", async () => {
    const upstream = await startUpstream({ signalStatus: 500 });
    process.env.MC_API_BASE_URL = `http://127.0.0.1:${upstream.port}`;
    try {
      const res = await signedRequest("wf1", { signal: "approve" });
      expect(res.status).toBe(502);
    } finally {
      await upstream.close();
    }
  });

  it("an unreachable upstream maps to 503", async () => {
    const upstream = await startUpstream();
    process.env.MC_API_BASE_URL = `http://127.0.0.1:${upstream.port}`;
    // The session endpoint stays real (the operator IS signed in); only
    // the signal transport dies — the realistic "API down mid-decision".
    const realFetch = global.fetch;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url = typeof input === "string" ? input : input.toString();
        if (url.includes("/signals/review")) throw new TypeError("fetch failed");
        return realFetch(new Request(url, init));
      }) as unknown as typeof fetch,
    );
    try {
      const res = await signedRequest("wf1", { signal: "approve" });
      // Mutant this kills: the cause-branch deleted → network failures
      // report 502 (refused) instead of 503 (unreachable).
      expect(res.status).toBe(503);
    } finally {
      vi.unstubAllGlobals();
      await upstream.close();
    }
  });

  it("a reject with a 2-character reason is blocked at 422 and never reaches the API", async () => {
    const upstream = await startUpstream();
    process.env.MC_API_BASE_URL = `http://127.0.0.1:${upstream.port}`;
    try {
      const res = await signedRequest("wf1", { signal: "reject", note: "ab" });
      expect(res.status).toBe(422);
      // Mutant this kills: the MIN_REASON_CHARS guard deleted → the signal
      // POST reaches the API with a 2-char note.
      expect(upstream.captured).toHaveLength(0);
    } finally {
      await upstream.close();
    }
  });

  it("a request without a session cookie is 401 before any signal POST", async () => {
    const upstream = await startUpstream();
    process.env.MC_API_BASE_URL = `http://127.0.0.1:${upstream.port}`;
    try {
      const res = await callRoute("wf1", {
        method: "POST",
        body: JSON.stringify({ signal: "approve" }),
      });
      expect(res.status).toBe(401);
      expect(upstream.captured).toHaveLength(0);
    } finally {
      await upstream.close();
    }
  });

  it("an invalid session (auth endpoint refuses) is 401", async () => {
    const upstream = await startUpstream({ sessionStatus: 401 });
    process.env.MC_API_BASE_URL = `http://127.0.0.1:${upstream.port}`;
    try {
      const res = await signedRequest("wf1", { signal: "approve" });
      expect(res.status).toBe(401);
      expect(upstream.captured).toHaveLength(0);
    } finally {
      await upstream.close();
    }
  });

  it("an unknown signal value is 400", async () => {
    const upstream = await startUpstream();
    process.env.MC_API_BASE_URL = `http://127.0.0.1:${upstream.port}`;
    try {
      const res = await signedRequest("wf1", { signal: "banana" });
      expect(res.status).toBe(400);
      expect(upstream.captured).toHaveLength(0);
    } finally {
      await upstream.close();
    }
  });

  it("an unset MC_API_BASE_URL is a 500 deployment error, never an invented default", async () => {
    delete process.env.MC_API_BASE_URL;
    // Mutant this kills: a `?? "http://localhost:8080"` default restored —
    // the request would try localhost and fail differently (or succeed in
    // a dev stack), not 500 here.
    const res = await callRoute("wf1", {
      method: "POST",
      headers: { cookie: "ec_session=jwt" },
      body: JSON.stringify({ signal: "approve" }),
    });
    expect(res.status).toBe(500);
  });
});
