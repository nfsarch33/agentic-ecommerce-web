import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers/auth";

const productId = "018f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c";

test("admin AI content studio previews, rejects, generates, approves, and edits product copy", async ({ page }) => {
  await signInAs(page, "operator");
  await page.goto(`/admin/products/${productId}/content`);

  await expect(page.getByRole("heading", { name: "AI Description Studio" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Current description" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Generated suggestion" })).toBeVisible();
  await expect(page.getByText("Quality score")).toBeVisible();
  await expect(page.getByText("Train anywhere with a durable five-band set")).toBeVisible();

  await page.getByRole("button", { name: /reject suggestion/i }).click();
  await expect(page.getByRole("status")).toContainText("Suggestion rejected.");
  await expect(page.getByText("No active AI suggestion.")).toBeVisible();

  await page.getByRole("button", { name: /generate description/i }).click();

  await expect(page.getByText("Fresh AI copy focused on ecommerce conversion")).toBeVisible();
  await page.getByRole("button", { name: /approve suggestion/i }).click();
  await expect(page.getByLabel("Editable description")).toHaveValue(
    "Fresh AI copy focused on ecommerce conversion and practical home workouts.",
  );

  await page.getByLabel("Editable description").fill(
    "Edited operator-approved copy for ecommerce conversion and practical home workouts.",
  );
  await expect(page.getByLabel("Editable description")).toHaveValue(
    "Edited operator-approved copy for ecommerce conversion and practical home workouts.",
  );
});
