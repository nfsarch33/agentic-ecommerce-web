import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers/auth";

test("admin compliance dashboard reviews rules and runs a bulk check", async ({ page }) => {
  await signInAs(page, "admin");
  await page.goto("/admin/compliance");

  await expect(page.getByRole("heading", { name: "Compliance Dashboard" })).toBeVisible();
  const summary = page.getByRole("region", { name: /compliance summary/i });
  await expect(summary.getByText("1 products")).toBeVisible();
  await expect(summary.getByText("1 failed", { exact: true })).toBeVisible();
  await expect(page.getByRole("row", { name: /resistance band set/i })).toContainText("62/100");

  await page.getByRole("button", { name: /review resistance band set/i }).click();
  await expect(page.getByRole("heading", { name: /resistance band set compliance detail/i })).toBeVisible();
  await expect(page.getByText(/guaranteed to cure pain/i)).toBeVisible();
  await expect(page.getByText("71/100")).toBeVisible();

  await page.getByLabel(/select resistance band set/i).check();
  await page.getByRole("button", { name: /run bulk compliance check/i }).click();
  await expect(page.getByRole("status")).toContainText("Checked 1 products.");
});
