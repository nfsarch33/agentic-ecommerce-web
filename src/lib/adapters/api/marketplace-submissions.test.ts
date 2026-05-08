import { describe, expect, it, vi } from "vitest";
import {
  approveMarketplaceSubmission,
  getMarketplaceSubmission,
  isSubmissionState,
  listMarketplaceSubmissions,
  parseSubmission,
  rejectMarketplaceSubmission,
  submitMarketplacePlugin,
  type MarketplaceSubmission,
} from "@/lib/adapters/api/marketplace-submissions";
import { MarketplaceApiError } from "@/lib/adapters/api/marketplace";
import type { PluginManifest } from "@/lib/domain/marketplace";

const baseManifest: PluginManifest = {
  slug: "stripe-payments",
  name: "Stripe Payments",
  version: "1.0.0",
  vendor: "Stripe",
  eventSubscriptions: [],
  permissions: [],
  dependencies: [],
};

const rawSubmission = {
  id: "sub-1",
  tenant_id: "tenant-a",
  submitter_email: "vendor@acme.example",
  manifest: {
    slug: "stripe-payments",
    name: "Stripe Payments",
    version: "1.0.0",
    vendor: "Stripe",
  },
  state: "pending_review",
  submitted_at: "2026-05-09T03:00:00Z",
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("marketplace-submissions adapter", () => {
  it("isSubmissionState narrows valid states", () => {
    expect(isSubmissionState("pending_review")).toBe(true);
    expect(isSubmissionState("approved")).toBe(true);
    expect(isSubmissionState("rejected")).toBe(true);
    expect(isSubmissionState("garbage")).toBe(false);
  });

  it("parseSubmission rejects unknown state", () => {
    expect(() => parseSubmission({ ...rawSubmission, state: "garbage" })).toThrow(MarketplaceApiError);
  });

  it("submitMarketplacePlugin posts canonical body", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(rawSubmission, 201));
    const out = await submitMarketplacePlugin({
      baseUrl: "http://api.test",
      tenantId: "tenant-a",
      submitterEmail: "vendor@acme.example",
      manifest: baseManifest,
      fetchImpl,
    });
    expect(out.id).toBe("sub-1");
    expect(out.state).toBe("pending_review");
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://api.test/api/v1/marketplace/plugins/submit",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("submitMarketplacePlugin propagates non-2xx errors", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 400 }));
    await expect(
      submitMarketplacePlugin({
        baseUrl: "http://api.test",
        tenantId: "tenant-a",
        submitterEmail: "vendor@acme.example",
        manifest: baseManifest,
        fetchImpl,
      }),
    ).rejects.toBeInstanceOf(MarketplaceApiError);
  });

  it("listMarketplaceSubmissions paginates and filters by tenant", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ submissions: [rawSubmission], total: 1, page: 1, per_page: 10 }),
    );
    const out = await listMarketplaceSubmissions({
      baseUrl: "http://api.test",
      tenantId: "tenant-a",
      page: 1,
      perPage: 10,
      fetchImpl,
    });
    expect(out.total).toBe(1);
    expect(out.submissions[0]?.id).toBe("sub-1");
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://api.test/api/v1/admin/marketplace/submissions?tenant_id=tenant-a&page=1&per_page=10",
      expect.objectContaining({}),
    );
  });

  it("listMarketplaceSubmissions omits tenant filter when absent", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ submissions: [], total: 0, page: 1, per_page: 20 }),
    );
    const out = await listMarketplaceSubmissions({ baseUrl: "http://api.test", fetchImpl });
    expect(out.submissions.length).toBe(0);
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://api.test/api/v1/admin/marketplace/submissions",
      expect.objectContaining({}),
    );
  });

  it("getMarketplaceSubmission returns the row", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(rawSubmission));
    const out: MarketplaceSubmission = await getMarketplaceSubmission({
      baseUrl: "http://api.test",
      id: "sub-1",
      fetchImpl,
    });
    expect(out.id).toBe("sub-1");
  });

  it("approveMarketplaceSubmission posts review notes", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ ...rawSubmission, state: "approved", reviewer: "admin@example.com", reviewed_at: "2026-05-09T03:05:00Z" }));
    const out = await approveMarketplaceSubmission({
      baseUrl: "http://api.test",
      id: "sub-1",
      reviewNotes: "looks good",
      fetchImpl,
    });
    expect(out.state).toBe("approved");
    expect(out.reviewer).toBe("admin@example.com");
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://api.test/api/v1/admin/marketplace/submissions/sub-1/approve",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("rejectMarketplaceSubmission posts review notes", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ ...rawSubmission, state: "rejected", reviewer: "admin", reviewed_at: "2026-05-09T03:05:00Z", review_notes: "missing license" }),
    );
    const out = await rejectMarketplaceSubmission({
      baseUrl: "http://api.test",
      id: "sub-1",
      reviewNotes: "missing license",
      fetchImpl,
    });
    expect(out.state).toBe("rejected");
    expect(out.reviewNotes).toBe("missing license");
  });

  it("approveMarketplaceSubmission propagates 422", async () => {
    const fetchImpl = vi.fn(async () => new Response("", { status: 422 }));
    await expect(
      approveMarketplaceSubmission({ baseUrl: "http://api.test", id: "sub-1", fetchImpl }),
    ).rejects.toBeInstanceOf(MarketplaceApiError);
  });
});
