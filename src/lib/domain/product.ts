// Domain entity: Product.
//
// This module knows nothing about HTTP, React, or the Go backend. It
// exists so the rest of the app (usecases, adapters, UI) can speak in a
// consistent vocabulary and so unit tests can exercise rules without
// network or DOM dependencies.

export type Currency = "AUD" | "USD" | "GBP" | "EUR";

export interface Money {
  /**
   * Amount in the smallest currency unit (e.g. cents). Must be >= 0
   * and an integer.
   */
  readonly amount: number;
  readonly currency: Currency;
}

// Use en-US locale so currency symbols render with their country prefix
// (A$, US$, etc.) regardless of the visitor's locale. The storefront
// targets a global audience, so consistent ISO-style symbols are
// clearer than locale-specific shorthand like a bare "$".
const currencyFormatters: Record<Currency, Intl.NumberFormat> = {
  AUD: new Intl.NumberFormat("en-US", { style: "currency", currency: "AUD" }),
  USD: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }),
  GBP: new Intl.NumberFormat("en-US", { style: "currency", currency: "GBP" }),
  EUR: new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }),
};

export function formatMoney(money: Money): string {
  const major = money.amount / 100;
  return currencyFormatters[money.currency].format(major);
}

export class ProductValidationError extends Error {
  override readonly name = "ProductValidationError";
}

function quote(s: string): string {
  return JSON.stringify(s);
}

export const ProductId = {
  parse(input: string): string {
    const id = input.trim();
    if (id === "") {
      throw new ProductValidationError(`product id must be non-empty: got ${quote(input)}`);
    }
    return id;
  },
} as const;

export interface ProductInput {
  readonly id: string;
  readonly sku: string;
  readonly title: string;
  readonly slug: string;
  readonly price: Money;
  readonly stock: number;
  readonly description?: string;
}

export interface ProductFields {
  readonly id: string;
  readonly sku: string;
  readonly title: string;
  readonly slug: string;
  readonly price: Money;
  readonly stock: number;
  readonly description?: string;
}

const slugRE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export class Product implements ProductFields {
  readonly id: string;
  readonly sku: string;
  readonly title: string;
  readonly slug: string;
  readonly price: Money;
  readonly stock: number;
  readonly description?: string;

  private constructor(fields: ProductFields) {
    this.id = fields.id;
    this.sku = fields.sku;
    this.title = fields.title;
    this.slug = fields.slug;
    this.price = fields.price;
    this.stock = fields.stock;
    this.description = fields.description;
  }

  static fromInput(input: ProductInput): Product {
    const id = ProductId.parse(input.id);
    const title = (input.title ?? "").trim();
    if (title === "") {
      throw new ProductValidationError("title must be non-empty");
    }
    const sku = (input.sku ?? "").trim().toUpperCase();
    if (sku === "") {
      throw new ProductValidationError("sku must be non-empty");
    }
    const slug = (input.slug ?? "").trim();
    if (!slugRE.test(slug)) {
      throw new ProductValidationError(`slug must be lower-kebab: got ${quote(slug)}`);
    }
    if (input.price.amount < 0) {
      throw new ProductValidationError("price.amount must be >= 0");
    }
    if (!Number.isInteger(input.price.amount)) {
      throw new ProductValidationError("price.amount must be an integer (cents)");
    }
    if (input.stock < 0 || !Number.isInteger(input.stock)) {
      throw new ProductValidationError("stock must be a non-negative integer");
    }
    return new Product({
      id,
      sku,
      title,
      slug,
      price: input.price,
      stock: input.stock,
      description: input.description,
    });
  }
}

export function isInStock(p: Pick<ProductFields, "stock">): boolean {
  return p.stock > 0;
}
