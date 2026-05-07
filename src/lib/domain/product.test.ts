import { describe, it, expect } from "vitest";
import {
  Product,
  ProductId,
  Money,
  formatMoney,
  isInStock,
  ProductValidationError,
} from "./product";

describe("Money", () => {
  it("formats AUD with 2 decimals", () => {
    const m: Money = { amount: 1999, currency: "AUD" };
    expect(formatMoney(m)).toBe("A$19.99");
  });

  it("formats USD with 2 decimals", () => {
    const m: Money = { amount: 1234, currency: "USD" };
    // en-US locale renders USD as the bare $ since USD is the locale default.
    expect(formatMoney(m)).toBe("$12.34");
  });

  it("formats zero amounts as a clean baseline", () => {
    const m: Money = { amount: 0, currency: "AUD" };
    expect(formatMoney(m)).toBe("A$0.00");
  });

  it("rejects negative amounts at construction", () => {
    expect(() => Product.fromInput({
      id: "018f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c",
      sku: "ROLLER-001",
      title: "x",
      slug: "x",
      price: { amount: -1, currency: "AUD" },
      stock: 1,
    })).toThrow(ProductValidationError);
  });
});

describe("ProductId", () => {
  it("accepts backend UUID product ids", () => {
    expect(() => ProductId.parse("018f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c")).not.toThrow();
  });

  it("rejects empty ids", () => {
    expect(() => ProductId.parse("")).toThrow(ProductValidationError);
  });

  it("rejects whitespace-only ids", () => {
    expect(() => ProductId.parse("   ")).toThrow(ProductValidationError);
  });
});

describe("Product.fromInput", () => {
  it("builds a valid product", () => {
    const p = Product.fromInput({
      id: "018f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c",
      sku: "band-001",
      title: "Resistance band set",
      slug: "resistance-band-set",
      price: { amount: 4995, currency: "AUD" },
      stock: 12,
      description: "Pro-grade bands.",
    });
    expect(p.id).toBe("018f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c");
    expect(p.sku).toBe("BAND-001");
    expect(p.title).toBe("Resistance band set");
    expect(p.slug).toBe("resistance-band-set");
    expect(p.price.amount).toBe(4995);
    expect(p.stock).toBe(12);
    expect(p.description).toBe("Pro-grade bands.");
  });

  it("trims title and rejects empty strings", () => {
    expect(() => Product.fromInput({
      id: "018f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c",
      sku: "SKU-001",
      title: "   ",
      slug: "x",
      price: { amount: 100, currency: "AUD" },
      stock: 1,
    })).toThrow(ProductValidationError);
  });

  it("rejects empty sku values", () => {
    expect(() => Product.fromInput({
      id: "018f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c",
      sku: "   ",
      title: "x",
      slug: "x",
      price: { amount: 100, currency: "AUD" },
      stock: 1,
    })).toThrow(ProductValidationError);
  });

  it("rejects negative stock", () => {
    expect(() => Product.fromInput({
      id: "018f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c",
      sku: "SKU-001",
      title: "x",
      slug: "x",
      price: { amount: 100, currency: "AUD" },
      stock: -1,
    })).toThrow(ProductValidationError);
  });

  it("rejects slug with whitespace", () => {
    expect(() => Product.fromInput({
      id: "018f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c",
      sku: "SKU-001",
      title: "x",
      slug: "bad slug",
      price: { amount: 100, currency: "AUD" },
      stock: 1,
    })).toThrow(ProductValidationError);
  });
});

describe("isInStock", () => {
  const base = Product.fromInput({
    id: "018f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c",
    sku: "SKU-001",
    title: "x",
    slug: "x",
    price: { amount: 100, currency: "AUD" },
    stock: 0,
  });

  it("returns false when stock is zero", () => {
    expect(isInStock(base)).toBe(false);
  });

  it("returns true when stock is positive", () => {
    const p = Product.fromInput({ ...base, stock: 1 });
    expect(isInStock(p)).toBe(true);
  });
});
