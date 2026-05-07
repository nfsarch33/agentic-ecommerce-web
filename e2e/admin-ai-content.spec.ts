import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers/auth";

const productId = "018f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c";

test.setTimeout(60_000);

test("admin AI content studio generates and approves product copy", async ({ page }) => {
  await signInAs(page, "admin");
  await page.goto(`/admin/products/${productId}/content`);

  await expect(page.getByRole("heading", { name: "AI Description Studio" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Current description" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Generated suggestion" })).toBeVisible();
  await expect(page.getByText("Quality score")).toBeVisible();

  await page.getByRole("button", { name: /generate description/i }).click();

  await expect(page.getByText("Fresh AI copy focused on ecommerce conversion")).toBeVisible();
  await page.getByRole("button", { name: /approve suggestion/i }).click();
  await expect(page.getByLabel("Editable description")).toHaveValue(
    "Fresh AI copy focused on ecommerce conversion and practical home workouts.",
  );
});

test("admin AI content studio shows RAG-backed fact-check evidence", async ({ page }) => {
  await signInAs(page, "admin");
  await page.goto(`/admin/products/${productId}/content`);

  await page.getByRole("button", { name: /generate description/i }).click();

  await expect(page.getByRole("heading", { name: /fact-check evidence/i })).toBeVisible();
  await expect(page.getByText("The set includes five tension levels.")).toBeVisible();
  await expect(page.getByText("Resistance Band Product Manual")).toBeVisible();
  await expect(page.getByText("91% match")).toBeVisible();
  await expect(page.getByText("Warranty coverage is available.")).toBeVisible();
  await expect(page.getByText("Ambiguous")).toBeVisible();
  await expect(page.getByText("1 need evidence")).toBeVisible();

  await page.getByLabel(/search source library/i).fill("five tension levels");
  await page.getByRole("button", { name: /search evidence/i }).click();

  await expect(page.getByRole("region", { name: /rag source viewer/i })).toContainText(
    "Resistance Band Product Manual",
  );
});
