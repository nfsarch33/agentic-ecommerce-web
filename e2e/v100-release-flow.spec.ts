import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers/auth";

const orderId = "318f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c";
const productId = "018f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c";

test.skip(process.env.E2E_RELEASE_FLOW !== "true", "run with make release-e2e");

test("v1.0.0 release flow covers storefront checkout and admin AI compliance", async ({ page }) => {
  await page.goto("/products");
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /resistance band set/i })).toBeVisible();

  await page.getByRole("button", { name: /add to cart/i }).first().click();
  await page.getByRole("link", { name: /view cart/i }).click();
  await page.getByRole("link", { name: /checkout/i }).click();

  await page.getByLabel(/email/i).fill("shopper@example.com");
  await page.getByLabel(/full name/i).fill("Jane Shopper");
  await page.getByLabel(/address line 1/i).fill("1 Market Street");
  await page.getByLabel(/city/i).fill("Sydney");
  await page.getByLabel(/state or region/i).fill("NSW");
  await page.getByLabel(/postal code/i).fill("2000");
  await page.getByRole("button", { name: /place order/i }).click();

  await expect(page).toHaveURL(new RegExp(`/orders/${orderId}$`));
  await expect(page.getByRole("heading", { name: /order confirmed/i })).toBeVisible();
  await expect(page.getByText("shopper@example.com")).toBeVisible();

  await signInAs(page, "admin");
  await page.goto(`/admin/orders?id=${orderId}`);
  await expect(page.getByRole("heading", { name: "Order Management" })).toBeVisible();
  await expect(page.getByText("shopper@example.com")).toBeVisible();
  await expect(page.getByText("Resistance Band Set")).toBeVisible();

  await page.goto(`/admin/products/${productId}/content`);
  await expect(page.getByRole("heading", { name: "AI Description Studio" })).toBeVisible();
  await page.getByRole("button", { name: /generate description/i }).click();
  await expect(page.getByText("Fresh AI copy focused on ecommerce conversion")).toBeVisible();
  await page.getByRole("button", { name: /approve suggestion/i }).click();
  await expect(page.getByRole("status")).toContainText("Suggestion approved");

  await page.goto("/admin/compliance");
  await expect(page.getByRole("heading", { name: "Compliance Dashboard" })).toBeVisible();
  await expect(page.getByText("1 passed")).toBeVisible();
  await expect(page.getByRole("row", { name: /resistance band set/i })).toContainText("Pass");
  await expect(page.getByRole("row", { name: /resistance band set/i })).toContainText("96/100");
});
