import { test, expect } from "@playwright/test";

test("products page and product detail render against mc-api", async ({ page }) => {
  await page.goto("/products");
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /resistance band set/i })).toBeVisible();

  await page.goto("/products/resistance-band-set");
  await expect(page.getByRole("heading", { name: /resistance band set/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /add to cart/i })).toBeEnabled();
});
