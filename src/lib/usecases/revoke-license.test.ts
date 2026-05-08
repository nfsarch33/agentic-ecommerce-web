import { describe, expect, it, vi } from "vitest";
import {
  IllegalLicenseTransitionError,
  type License,
} from "@/lib/domain/digital";
import { revokeLicenseUsecase } from "./revoke-license";

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

describe("revokeLicenseUsecase", () => {
  it("calls the adapter for an active licence", async () => {
    const lic = activeLicense();
    const revokeImpl = vi.fn(async () => ({ ...lic, state: "revoked" as const }));
    const out = await revokeLicenseUsecase(
      { baseUrl: "http://api.test", tenantId: "tenant-a", license: lic },
      { revokeImpl },
    );
    expect(out.state).toBe("revoked");
    expect(revokeImpl).toHaveBeenCalled();
  });

  it("rejects revoking a revoked licence before the network call", async () => {
    const revokeImpl = vi.fn();
    await expect(
      revokeLicenseUsecase(
        {
          baseUrl: "http://api.test",
          tenantId: "tenant-a",
          license: { ...activeLicense(), state: "revoked" },
        },
        { revokeImpl },
      ),
    ).rejects.toBeInstanceOf(IllegalLicenseTransitionError);
    expect(revokeImpl).not.toHaveBeenCalled();
  });

  it("rejects revoking an expired licence before the network call", async () => {
    const revokeImpl = vi.fn();
    await expect(
      revokeLicenseUsecase(
        {
          baseUrl: "http://api.test",
          tenantId: "tenant-a",
          license: { ...activeLicense(), state: "expired" },
        },
        { revokeImpl },
      ),
    ).rejects.toBeInstanceOf(IllegalLicenseTransitionError);
    expect(revokeImpl).not.toHaveBeenCalled();
  });
});
