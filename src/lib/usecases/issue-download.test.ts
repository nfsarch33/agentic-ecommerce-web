import { describe, expect, it, vi } from "vitest";
import type { License } from "@/lib/domain/digital";
import { DownloadDisallowedError, issueDownloadUsecase } from "./issue-download";

function activeLicense(): License {
  return {
    id: "lic-1",
    tenantId: "tenant-a",
    productId: "prod-1",
    customerId: "cust-1",
    key: "AAAAA-BBBBB-CCCCC-DDDDD-EEEEEEEE",
    state: "active",
    issuedAt: "2026-05-08T12:00:00Z",
    maxActivations: 1,
    updatedAt: "2026-05-08T12:00:00Z",
  };
}

describe("issueDownloadUsecase", () => {
  it("calls the adapter for an active licence", async () => {
    const downloadImpl = vi.fn(async () => ({
      url: "https://cdn.example/?sig=abc",
      expiresAt: "2026-05-08T12:05:00Z",
      usesAllowed: 3,
    }));
    const out = await issueDownloadUsecase(
      { baseUrl: "http://api.test", tenantId: "tenant-a", license: activeLicense() },
      { downloadImpl },
    );
    expect(out.url).toContain("sig=");
  });

  it("blocks downloads for revoked or expired licences", async () => {
    const downloadImpl = vi.fn();
    await expect(
      issueDownloadUsecase(
        {
          baseUrl: "http://api.test",
          tenantId: "tenant-a",
          license: { ...activeLicense(), state: "revoked" },
        },
        { downloadImpl },
      ),
    ).rejects.toBeInstanceOf(DownloadDisallowedError);
    expect(downloadImpl).not.toHaveBeenCalled();
    await expect(
      issueDownloadUsecase(
        {
          baseUrl: "http://api.test",
          tenantId: "tenant-a",
          license: { ...activeLicense(), state: "expired" },
        },
        { downloadImpl },
      ),
    ).rejects.toBeInstanceOf(DownloadDisallowedError);
    expect(downloadImpl).not.toHaveBeenCalled();
  });
});
