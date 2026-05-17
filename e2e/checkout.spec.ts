import { expect, test } from "@playwright/test";

test("shopper checks out from product browse to order confirmation", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /browse products/i }).click();

  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
  await page
    .getByRole("button", { name: /add to cart/i })
    .first()
    .click();
  await page.getByRole("link", { name: /view cart/i }).click();

  await expect(page.getByRole("heading", { name: /your cart/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Resistance Band Set" })).toBeVisible();
  await page.getByRole("link", { name: /checkout/i }).click();

  await page.getByLabel(/email/i).fill("shopper@example.com");
  await page.getByLabel(/full name/i).fill("Jane Shopper");
  await page.getByLabel(/address line 1/i).fill("1 Market Street");
  await page.getByLabel(/city/i).fill("Sydney");
  await page.getByLabel(/state or region/i).fill("NSW");
  await page.getByLabel(/postal code/i).fill("2000");
  await Promise.all([
    page.waitForURL(/\/orders\/318f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c$/, { timeout: 20_000 }),
    page.getByRole("button", { name: /place order/i }).click(),
  ]);

  await expect(page.getByRole("heading", { name: /order received/i })).toBeVisible();
  await expect(page.getByText("shopper@example.com")).toBeVisible();
  await expect(page.getByText(/Resistance Band Set x 1/i)).toBeVisible();
});
