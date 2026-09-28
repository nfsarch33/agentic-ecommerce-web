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
  authorization: string;
  idempotencyKey: string;
}

interface Upstream {
  server: http.Server;
  port: number;
  captured: Captured[];
  authCalls: number;
  signalStatus: number;
  sessionStatus: number;
  close(): Promise<void>;
}

async function withUpstream(
  overrides: Partial<Pick<Upstream, "signalStatus" | "sessionStatus">>,
  run: (upstream: Upstream) => Promise<void>,
): Promise<void> {
  const upstream = await startUpstream(overrides);
  vi.stubEnv("MC_API_BASE_URL", `http://127.0.0.1:${upstream.port}`);
  try {
    await run(upstream);
  } finally {
    await upstream.close();
  }
}

async function startUpstream(
  overrides: Partial<Pick<Upstream, "signalStatus" | "sessionStatus">> = {},
): Promise<Upstream> {
  const upstream: Upstream = {
    server: null as unknown as http.Server,
    port: 0,
    captured: [],
    authCalls: 0,
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
        upstream.authCalls += 1;
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
          authorization: String(req.headers["authorization"] ?? ""),
          idempotencyKey: String(req.headers["idempotency-key"] ?? ""),
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

function signedRequest(
  id: string,
  body: unknown,
  extraHeaders: Record<string, string> = {},
): Promise<Response> {
  return callRoute(id, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://web.test",
      cookie: "ec_session=jwt-token",
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("identity", () => {
  it("sends the SESSION user as reviewer and forwards the bearer + Idempotency-Key upstream", async () => {
    await withUpstream({}, async (upstream) => {
      const res = await signedRequest(
        "wf1",
        { signal: "approve", reviewer: "attacker@example.com" },
        { "idempotency-key": "key-1234" },
      );
      expect(res.status).toBe(202);
      expect(upstream.captured).toHaveLength(1);
      const sent = upstream.captured[0];
      // Mutant this kills: reviewer taken from the browser body (or
      // dropped entirely) — the attacker address or no reviewer arrives.
      expect(sent?.body).toEqual({ approved: true, reviewer: "operator@example.com" });
      // Mutant this kills: the bearer not forwarded.
      expect(sent?.authorization).toBe("Bearer jwt-token");
      // Mutant this kills: the Idempotency-Key not forwarded.
      expect(sent?.idempotencyKey).toBe("key-1234");
    });
  });

  it("a request without a session cookie is 401 before any signal POST", async () => {
    await withUpstream({}, async (upstream) => {
      const res = await callRoute("wf1", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://web.test" },
        body: JSON.stringify({ signal: "approve" }),
      });
      expect(res.status).toBe(401);
      expect(upstream.captured).toHaveLength(0);
    });
  });

  it("an invalid session (auth endpoint refuses) is 401", async () => {
    await withUpstream({ sessionStatus: 401 }, async (upstream) => {
      const res = await signedRequest("wf1", { signal: "approve" });
      expect(res.status).toBe(401);
      expect(upstream.captured).toHaveLength(0);
    });
  });
});

describe("CSRF", () => {
  it("a cross-site Origin is 403 with ZERO upstream calls (not even auth)", async () => {
    await withUpstream({}, async (upstream) => {
      const res = await signedRequest("wf1", { signal: "approve" }, { origin: "https://evil.example" });
      expect(res.status).toBe(403);
      // Mutant this kills: the same-origin check deleted (or moved after
      // the session fetch) — upstream calls appear.
      expect(upstream.captured).toHaveLength(0);
      expect(upstream.authCalls).toBe(0);
    });
  });

  it("no Origin and no Sec-Fetch-Site is 403", async () => {
    await withUpstream({}, async (upstream) => {
      const res = await callRoute("wf1", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: "ec_session=jwt" },
        body: JSON.stringify({ signal: "approve" }),
      });
      expect(res.status).toBe(403);
      expect(upstream.captured).toHaveLength(0);
    });
  });

  it("Sec-Fetch-Site: same-origin is accepted without an Origin header", async () => {
    await withUpstream({}, async (upstream) => {
      const res = await callRoute("wf1", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "sec-fetch-site": "same-origin",
          cookie: "ec_session=jwt",
        },
        body: JSON.stringify({ signal: "approve" }),
      });
      expect(res.status).toBe(202);
      expect(upstream.captured).toHaveLength(1);
    });
  });

  it("a text/plain body is 415 with ZERO upstream calls", async () => {
    await withUpstream({}, async (upstream) => {
      const res = await callRoute("wf1", {
        method: "POST",
        headers: { "content-type": "text/plain", origin: "http://web.test", cookie: "ec_session=jwt" },
        body: JSON.stringify({ signal: "approve" }),
      });
      expect(res.status).toBe(415);
      // Mutant this kills: the content-type check deleted — the request
      // parses and proceeds upstream.
      expect(upstream.captured).toHaveLength(0);
      expect(upstream.authCalls).toBe(0);
    });
  });
});

describe("workflow id", () => {
  it.each(["..", ".", "a/b", "a b", ""])("id %j is 400 with ZERO upstream calls", async (id) => {
    await withUpstream({}, async (upstream) => {
      const res = await signedRequest(id, { signal: "approve" });
      expect(res.status).toBe(400);
      // Mutant this kills: the allowlist deleted — ".." reaches the
      // adapter and the upstream path moves.
      expect(upstream.captured).toHaveLength(0);
    });
  });

  it("an allowed but encodable id character (:) is percent-encoded once in the upstream path", async () => {
    await withUpstream({}, async (upstream) => {
      const res = await signedRequest("wf:2", { signal: "approve" });
      expect(res.status).toBe(202);
      // Mutant this kills: encodeURIComponent dropped in the adapter —
      // the path would arrive raw.
      expect(upstream.captured[0]?.url).toBe("/api/v1/workflows/wf%3A2/signals/review");
    });
  });
});

describe("body contract", () => {
  it("approve sends {approved:true, reviewer} through the real adapter", async () => {
    await withUpstream({}, async (upstream) => {
      const res = await signedRequest("wf1", { signal: "approve" });
      expect(res.status).toBe(202);
      expect(upstream.captured[0]?.method).toBe("POST");
      expect(upstream.captured[0]?.contentType).toContain("application/json");
      expect(upstream.captured[0]?.body).toEqual({ approved: true, reviewer: "operator@example.com" });
    });
  });

  it("reject sends {approved:false, note, reviewer}", async () => {
    await withUpstream({}, async (upstream) => {
      const res = await signedRequest("wf2", { signal: "reject", note: "wrong size chart" });
      expect(res.status).toBe(202);
      expect(upstream.captured[0]?.body).toEqual({
        approved: false,
        note: "wrong size chart",
        reviewer: "operator@example.com",
      });
    });
  });

  it("a reject with a 2-character reason is 422 and never reaches the API", async () => {
    await withUpstream({}, async (upstream) => {
      const res = await signedRequest("wf1", { signal: "reject", note: "ab" });
      expect(res.status).toBe(422);
      // Mutant this kills: the MIN_REASON_CHARS guard deleted.
      expect(upstream.captured).toHaveLength(0);
    });
  });

  it("an unknown signal value is 400", async () => {
    await withUpstream({}, async (upstream) => {
      const res = await signedRequest("wf1", { signal: "banana" });
      expect(res.status).toBe(400);
      expect(upstream.captured).toHaveLength(0);
    });
  });
});

describe("upstream status classes", () => {
  it("a real-adapter 409 passes through as 409 (decided elsewhere)", async () => {
    await withUpstream({ signalStatus: 409 }, async () => {
      const res = await signedRequest("wf1", { signal: "approve" });
      // Exercises the adapter's WorkflowsApiError with a structured
      // status; the route classifies from err.status, not messages.
      // Mutant this kills: the 404/409 passthrough deleted → 502.
      expect(res.status).toBe(409);
    });
  });

  it("an upstream 400 maps to 422 (invalid, not retryable)", async () => {
    await withUpstream({ signalStatus: 400 }, async () => {
      const res = await signedRequest("wf1", { signal: "approve" });
      // Mutant this kills: the 400/422 branch deleted → 502 retryable.
      expect(res.status).toBe(422);
    });
  });

  it("an upstream 401 maps to 401 (sign in again)", async () => {
    await withUpstream({ signalStatus: 401 }, async () => {
      const res = await signedRequest("wf1", { signal: "approve" });
      // Mutant this kills: the 401/403 branch deleted → 502 retryable.
      expect(res.status).toBe(401);
    });
  });

  it("an upstream 500 maps to 502 (retryable)", async () => {
    await withUpstream({ signalStatus: 500 }, async () => {
      const res = await signedRequest("wf1", { signal: "approve" });
      expect(res.status).toBe(502);
    });
  });

  it("an unreachable upstream maps to 503", async () => {
    const upstream = await startUpstream();
    vi.stubEnv("MC_API_BASE_URL", `http://127.0.0.1:${upstream.port}`);
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
});

describe("configuration", () => {
  it("an unset MC_API_BASE_URL is a 500 deployment error, never an invented default", async () => {
    vi.stubEnv("MC_API_BASE_URL", undefined); // unset, not empty string
    const res = await callRoute("wf1", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "sec-fetch-site": "same-origin",
        cookie: "ec_session=jwt",
      },
      body: JSON.stringify({ signal: "approve" }),
    });
    // Mutant this kills: a `?? "http://localhost:8080"` default restored.
    expect(res.status).toBe(500);
  });
});
