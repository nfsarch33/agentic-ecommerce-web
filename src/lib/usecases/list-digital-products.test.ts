import { describe, expect, it, vi } from "vitest";
import { DigitalProductsApiError } from "@/lib/adapters/api/digital-products";
import { listDigitalProductsUsecase } from "./list-digital-products";

describe("listDigitalProductsUsecase", () => {
  it("returns the adapter result on success", async () => {
    const listImpl = vi.fn(async () => ({
      products: [
        {
          id: "prod-1",
          tenantId: "tenant-a",
          sku: "PDF",
          name: "X",
          filePath: "x",
          fileSize: 1,
          version: "1",
          createdAt: "2026-05-08T12:00:00Z",
          updatedAt: "2026-05-08T12:00:00Z",
        },
      ],
      total: 1,
      page: 1,
      perPage: 20,
    }));
    const out = await listDigitalProductsUsecase(
      { baseUrl: "http://api.test", tenantId: "tenant-a" },
      { listImpl },
    );
    expect(out.products).toHaveLength(1);
    expect(out.total).toBe(1);
  });

  it("converts adapter errors into a recoverable shape", async () => {
    const listImpl = vi.fn(async () => {
      throw new DigitalProductsApiError("boom");
    });
    const out = await listDigitalProductsUsecase(
      { baseUrl: "http://api.test", tenantId: "tenant-a" },
      { listImpl },
    );
    expect(out.products).toEqual([]);
    expect(out.total).toBe(0);
    expect(out.error).toBe("boom");
  });

  it("re-throws unexpected errors", async () => {
    const listImpl = vi.fn(async () => {
      throw new Error("unexpected");
    });
    await expect(
      listDigitalProductsUsecase(
        { baseUrl: "http://api.test", tenantId: "tenant-a" },
        { listImpl },
      ),
    ).rejects.toThrow("unexpected");
  });
});
