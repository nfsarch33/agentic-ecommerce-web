import type { PluginManifest } from "@/lib/domain/marketplace";
import type { ProductFields } from "@/lib/domain/product";
import { isInStock } from "@/lib/domain/product";

export function productJsonLd(product: ProductFields, url: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    sku: product.sku,
    url,
    offers: {
      "@type": "Offer",
      price: (product.price.amount / 100).toFixed(2),
      priceCurrency: product.price.currency,
      availability: isInStock(product)
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url,
    },
  };
}

export function marketplacePluginJsonLd(manifest: PluginManifest, url: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: manifest.name,
    description: manifest.description,
    applicationCategory: manifest.category ?? "Ecommerce plugin",
    softwareVersion: manifest.version,
    url,
    sameAs: manifest.homepageUrl,
    publisher: {
      "@type": "Organization",
      name: manifest.vendor,
    },
  };
}

export function jsonLdMarkup(data: Record<string, unknown>): { readonly __html: string } {
  return { __html: JSON.stringify(data) };
}
