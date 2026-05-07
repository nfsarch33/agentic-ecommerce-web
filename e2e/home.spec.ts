import { test, expect } from "@playwright/test";

test("home page renders the hero", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /agentic ecommerce/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /browse products/i })).toBeVisible();
});
