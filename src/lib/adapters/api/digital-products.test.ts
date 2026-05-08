import { describe, expect, it, vi } from "vitest";
import {
  DigitalProductsApiError,
  createDigitalProduct,
  fetchDigitalProduct,
  listDigitalProducts,
  parseDigitalProduct,
} from "./digital-products";

const baseProduct = {
  id: "prod-1",
  tenant_id: "tenant-a",
  sku: "PDF-001",
  name: "Sample",
  description: "",
  file_path: "tenant-a/x.pdf",
  file_size: 1024,
  content_type: "application/pdf",
  checksum: "sha256:abc",
  version: "1.0.0",
  created_at: "2026-05-08T12:00:00Z",
  updated_at: "2026-05-08T12:00:00Z",
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("digital-products adapter", () => {
  it("listDigitalProducts paginates the result", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ products: [baseProduct], total: 1, page: 2, per_page: 5 }),
    );
    const out = await listDigitalProducts({
      baseUrl: "http://api.test",
      tenantId: "tenant-a",
      page: 2,
      perPage: 5,
      fetchImpl,
    });
    expect(out.total).toBe(1);
    expect(out.products[0]?.sku).toBe("PDF-001");
    const firstCall = (fetchImpl.mock.calls[0] ?? []) as unknown[];
    const url = String(firstCall[0] ?? "");
    expect(url).toContain("page=2");
    expect(url).toContain("per_page=5");
  });

  it("listDigitalProducts surfaces network errors", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("offline");
    });
    await expect(
      listDigitalProducts({ baseUrl: "http://api.test", tenantId: "tenant-a", fetchImpl }),
    ).rejects.toBeInstanceOf(DigitalProductsApiError);
  });

  it("listDigitalProducts surfaces HTTP errors", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 500 }));
    await expect(
      listDigitalProducts({ baseUrl: "http://api.test", tenantId: "tenant-a", fetchImpl }),
    ).rejects.toBeInstanceOf(DigitalProductsApiError);
  });

  it("listDigitalProducts rejects non-array response", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ products: "x" }));
    await expect(
      listDigitalProducts({ baseUrl: "http://api.test", tenantId: "tenant-a", fetchImpl }),
    ).rejects.toBeInstanceOf(DigitalProductsApiError);
  });

  it("fetchDigitalProduct round-trips", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(baseProduct));
    const out = await fetchDigitalProduct({
      baseUrl: "http://api.test",
      tenantId: "tenant-a",
      id: "prod-1",
      fetchImpl,
    });
    expect(out.name).toBe("Sample");
  });

  it("fetchDigitalProduct surfaces 404", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 404 }));
    await expect(
      fetchDigitalProduct({
        baseUrl: "http://api.test",
        tenantId: "tenant-a",
        id: "prod-1",
        fetchImpl,
      }),
    ).rejects.toMatchObject({ message: expect.stringContaining("HTTP 404") });
  });

  it("createDigitalProduct posts JSON", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(baseProduct, 201));
    const out = await createDigitalProduct({
      baseUrl: "http://api.test",
      tenantId: "tenant-a",
      sku: "PDF-001",
      name: "Sample",
      filePath: "tenant-a/x.pdf",
      fileSize: 1024,
      version: "1.0.0",
      fetchImpl,
    });
    expect(out.id).toBe("prod-1");
    const firstCall = (fetchImpl.mock.calls[0] ?? []) as unknown[];
    const init = (firstCall[1] ?? {}) as RequestInit;
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toMatchObject({ sku: "PDF-001" });
  });

  it("required arguments are enforced", async () => {
    await expect(
      listDigitalProducts({ baseUrl: "", tenantId: "tenant-a", fetchImpl: vi.fn() }),
    ).rejects.toBeInstanceOf(DigitalProductsApiError);
    await expect(
      listDigitalProducts({ baseUrl: "http://api.test", tenantId: "", fetchImpl: vi.fn() }),
    ).rejects.toBeInstanceOf(DigitalProductsApiError);
    await expect(
      fetchDigitalProduct({
        baseUrl: "http://api.test",
        tenantId: "tenant-a",
        id: "",
        fetchImpl: vi.fn(),
      }),
    ).rejects.toBeInstanceOf(DigitalProductsApiError);
    await expect(
      createDigitalProduct({
        baseUrl: "",
        tenantId: "tenant-a",
        sku: "x",
        name: "x",
        filePath: "x",
        fileSize: 1,
        version: "1",
        fetchImpl: vi.fn(),
      }),
    ).rejects.toBeInstanceOf(DigitalProductsApiError);
  });

  it("parseDigitalProduct rejects missing id", () => {
    expect(() => parseDigitalProduct({})).toThrow(DigitalProductsApiError);
  });
});
