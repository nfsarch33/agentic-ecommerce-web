import { describe, expect, it } from "vitest";
import {
  approveSubmissionUsecase,
  getSubmissionUsecase,
  listSubmissionsUsecase,
  rejectSubmissionUsecase,
  submitPluginUsecase,
} from "@/lib/usecases/review-submission";
import { MarketplaceApiError } from "@/lib/adapters/api/marketplace";
import type { MarketplaceSubmission, MarketplaceSubmissionsList } from "@/lib/adapters/api/marketplace-submissions";
import type { PluginManifest } from "@/lib/domain/marketplace";

const manifest: PluginManifest = {
  slug: "stripe-payments",
  name: "Stripe Payments",
  version: "1.0.0",
  vendor: "Stripe",
  eventSubscriptions: [],
  permissions: [],
  dependencies: [],
};

const fakeSubmission: MarketplaceSubmission = {
  id: "sub-1",
  tenantId: "tenant-a",
  submitterEmail: "vendor@acme.example",
  manifest,
  state: "pending_review",
  submittedAt: "2026-05-09T03:00:00Z",
};

describe("submitPluginUsecase", () => {
  it("returns ok with the created submission", async () => {
    const out = await submitPluginUsecase(
      { baseUrl: "http://api", tenantId: "tenant-a", submitterEmail: "v@a.example", manifest },
      { submitImpl: async () => fakeSubmission },
    );
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.submission.id).toBe("sub-1");
    }
  });

  it("returns error string on MarketplaceApiError", async () => {
    const out = await submitPluginUsecase(
      { baseUrl: "http://api", tenantId: "tenant-a", submitterEmail: "v@a.example", manifest },
      {
        submitImpl: async () => {
          throw new MarketplaceApiError("invalid_submission", 400);
        },
      },
    );
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.error).toBe("invalid_submission");
    }
  });

  it("returns error string on generic Error", async () => {
    const out = await submitPluginUsecase(
      { baseUrl: "http://api", tenantId: "tenant-a", submitterEmail: "v@a.example", manifest },
      {
        submitImpl: async () => {
          throw new Error("network down");
        },
      },
    );
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.error).toBe("network down");
    }
  });

  it("returns 'unknown error' for non-Error throws", async () => {
    const out = await submitPluginUsecase(
      { baseUrl: "http://api", tenantId: "tenant-a", submitterEmail: "v@a.example", manifest },
      {
        submitImpl: async () => {
          throw { not: "an error" };
        },
      },
    );
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error).toBe("unknown error");
  });
});

describe("listSubmissionsUsecase", () => {
  it("returns ok with the list", async () => {
    const fakeList: MarketplaceSubmissionsList = {
      submissions: [fakeSubmission],
      total: 1,
      page: 1,
      perPage: 20,
    };
    const out = await listSubmissionsUsecase(
      { baseUrl: "http://api" },
      { listImpl: async () => fakeList },
    );
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.list.total).toBe(1);
  });

  it("propagates errors", async () => {
    const out = await listSubmissionsUsecase(
      { baseUrl: "http://api" },
      {
        listImpl: async () => {
          throw new MarketplaceApiError("boom", 500);
        },
      },
    );
    expect(out.ok).toBe(false);
  });
});

describe("getSubmissionUsecase", () => {
  it("ok path", async () => {
    const out = await getSubmissionUsecase(
      { baseUrl: "http://api", id: "sub-1" },
      { getImpl: async () => fakeSubmission },
    );
    expect(out.ok).toBe(true);
  });
});

describe("approveSubmissionUsecase", () => {
  it("returns approved submission", async () => {
    const approved: MarketplaceSubmission = { ...fakeSubmission, state: "approved", reviewer: "admin", reviewedAt: "2026-05-09T03:05:00Z" };
    const out = await approveSubmissionUsecase(
      { baseUrl: "http://api", id: "sub-1", reviewNotes: "ok" },
      { approveImpl: async () => approved },
    );
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.submission.state).toBe("approved");
  });

  it("propagates 422", async () => {
    const out = await approveSubmissionUsecase(
      { baseUrl: "http://api", id: "sub-1" },
      {
        approveImpl: async () => {
          throw new MarketplaceApiError("invalid_transition", 422);
        },
      },
    );
    expect(out.ok).toBe(false);
  });
});

describe("rejectSubmissionUsecase", () => {
  it("returns rejected submission", async () => {
    const rejected: MarketplaceSubmission = { ...fakeSubmission, state: "rejected", reviewer: "admin", reviewedAt: "2026-05-09T03:05:00Z", reviewNotes: "missing license" };
    const out = await rejectSubmissionUsecase(
      { baseUrl: "http://api", id: "sub-1", reviewNotes: "missing license" },
      { rejectImpl: async () => rejected },
    );
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.submission.reviewNotes).toBe("missing license");
  });
});
