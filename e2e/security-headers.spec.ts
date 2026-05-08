import { test, expect } from "@playwright/test";

// v2.9.0 carryover from the v2.8.0 OWASP audit. Asserts every
// response carries the six security headers configured in
// next.config.ts. We probe the home page (/) and an admin page
// (/admin/products) to verify the rule applies to every route, not
// just the public landing surface.
test.describe("Security headers", () => {
  for (const path of ["/", "/admin/products"]) {
    test(`GET ${path} returns the v2.9.0 security headers`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.status()).toBeLessThan(500);
      const headers = response.headers();
      expect(headers["content-security-policy"], "Content-Security-Policy").toContain("default-src 'self'");
      expect(headers["content-security-policy"], "frame-ancestors").toContain("frame-ancestors 'none'");
      expect(headers["x-frame-options"], "X-Frame-Options").toBe("DENY");
      expect(headers["x-content-type-options"], "X-Content-Type-Options").toBe("nosniff");
      expect(headers["referrer-policy"], "Referrer-Policy").toBe("strict-origin-when-cross-origin");
      expect(headers["strict-transport-security"], "Strict-Transport-Security").toContain("max-age=");
      expect(headers["permissions-policy"], "Permissions-Policy").toContain("camera=()");
    });
  }
});
