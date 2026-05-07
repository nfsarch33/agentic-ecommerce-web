import { expect, test } from "@playwright/test";

test("admin compliance dashboard reviews rules and runs a bulk check", async ({ page }) => {
  await page.goto("/admin/compliance");

  await expect(page.getByRole("heading", { name: "Compliance Dashboard" })).toBeVisible();
  await expect(page.getByText("1 products")).toBeVisible();
  await expect(page.getByText("1 failed")).toBeVisible();
  await expect(page.getByRole("row", { name: /resistance band set/i })).toContainText("62/100");

  await page.getByRole("button", { name: /review resistance band set/i }).click();
  await expect(page.getByRole("heading", { name: /resistance band set compliance detail/i })).toBeVisible();
  await expect(page.getByText(/guaranteed to cure pain/i)).toBeVisible();
  await expect(page.getByText("71/100")).toBeVisible();

  await page.getByLabel(/select resistance band set/i).check();
  await page.getByRole("button", { name: /run bulk compliance check/i }).click();
  await expect(page.getByRole("status")).toContainText("Checked 1 products.");
});
