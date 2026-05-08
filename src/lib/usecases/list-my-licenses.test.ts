import { describe, expect, it, vi } from "vitest";
import { LicensesApiError } from "@/lib/adapters/api/licenses";
import { listMyLicensesUsecase } from "./list-my-licenses";

describe("listMyLicensesUsecase", () => {
  it("returns adapter results on success", async () => {
    const listImpl = vi.fn(async () => ({
      licenses: [
        {
          id: "lic-1",
          tenantId: "tenant-a",
          productId: "prod-1",
          customerId: "cust-1",
          key: "AAAAA-BBBBB-CCCCC-DDDDD-EEEEEEEE",
          state: "active" as const,
          issuedAt: "2026-05-08T12:00:00Z",
          maxActivations: 1,
          updatedAt: "2026-05-08T12:00:00Z",
        },
      ],
      total: 1,
      page: 1,
      perPage: 20,
    }));
    const out = await listMyLicensesUsecase(
      { baseUrl: "http://api.test", tenantId: "tenant-a" },
      { listImpl },
    );
    expect(out.licenses).toHaveLength(1);
    expect(out.total).toBe(1);
  });

  it("returns empty + error message on adapter failure", async () => {
    const listImpl = vi.fn(async () => {
      throw new LicensesApiError("offline");
    });
    const out = await listMyLicensesUsecase(
      { baseUrl: "http://api.test", tenantId: "tenant-a" },
      { listImpl },
    );
    expect(out.licenses).toEqual([]);
    expect(out.error).toBe("offline");
  });

  it("re-throws non-adapter errors", async () => {
    const listImpl = vi.fn(async () => {
      throw new Error("crash");
    });
    await expect(
      listMyLicensesUsecase(
        { baseUrl: "http://api.test", tenantId: "tenant-a" },
        { listImpl },
      ),
    ).rejects.toThrow("crash");
  });
});
