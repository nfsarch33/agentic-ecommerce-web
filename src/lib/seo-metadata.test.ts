import { describe, expect, it } from "vitest";
import { adminPageMetadata, privatePageMetadata, publicPageMetadata } from "./seo-metadata";

describe("SEO metadata helpers", () => {
  it("builds indexable public page metadata with a canonical URL", () => {
    const metadata = publicPageMetadata({
      title: "Products | Agentic Ecommerce",
      description: "Browse live product inventory from the Agentic Ecommerce storefront.",
      canonical: "/products",
    });

    expect(metadata.alternates?.canonical).toBe("/products");
    expect(metadata.description).toContain("product inventory");
    expect(metadata.robots).toEqual({ index: true, follow: true });
    expect(metadata.openGraph).toEqual(
      expect.objectContaining({
        title: "Products | Agentic Ecommerce",
        description: "Browse live product inventory from the Agentic Ecommerce storefront.",
        url: "/products",
        siteName: "Agentic Ecommerce",
        type: "website",
      }),
    );
    expect(metadata.twitter).toEqual(
      expect.objectContaining({
        card: "summary_large_image",
        title: "Products | Agentic Ecommerce",
      }),
    );
  });

  it("keeps admin console pages out of search indexes", () => {
    const metadata = adminPageMetadata({
      title: "Admin Dashboard | Agentic Ecommerce",
      description: "Operate catalog and workflow tools for Agentic Ecommerce.",
      canonical: "/admin",
    });

    expect(metadata.alternates?.canonical).toBe("/admin");
    expect(metadata.description).toContain("workflow tools");
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("keeps transactional private pages out of search indexes", () => {
    const metadata = privatePageMetadata({
      title: "Checkout | Agentic Ecommerce",
      description: "Enter shipping details and place an order through checkout.",
      canonical: "/checkout",
    });

    expect(metadata.alternates?.canonical).toBe("/checkout");
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
