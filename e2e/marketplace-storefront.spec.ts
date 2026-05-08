import { test, expect } from "@playwright/test";

// Public marketplace storefront. The mock API in e2e/run-with-mock.ts
// already serves /api/v1/marketplace/plugins for the admin
// marketplace flow, so the storefront pages share the same fixture
// (no new mock handlers required).
test.describe("Marketplace storefront", () => {
  test("/marketplace renders the public catalogue", async ({ page }) => {
    await page.goto("/marketplace");
    await expect(page.getByTestId("marketplace-storefront")).toBeVisible();
  });

  test("/marketplace search bar routes to /marketplace/search", async ({ page }) => {
    await page.goto("/marketplace");
    await page.getByTestId("marketplace-search-input").fill("stripe");
    await page.getByTestId("marketplace-search-submit").click();
    await expect(page).toHaveURL(/\/marketplace\/search\?q=stripe/);
    await expect(page.getByTestId("marketplace-search")).toBeVisible();
  });
});
