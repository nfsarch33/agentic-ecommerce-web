import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers/auth";

test("admin sync dashboard renders status, conflicts, and resolves a conflict", async ({ page }) => {
  await signInAs(page, "operator");
  await page.goto("/admin/sync");

  await expect(page.getByRole("heading", { name: "Sync Dashboard" })).toBeVisible();
  await expect(page.getByText("conflict_detected")).toBeVisible();
  await expect(page.getByText(/Product BAND-001/)).toBeVisible();
  await expect(page.getByText("Resistance Band Pro")).toBeVisible();

  await page.getByRole("button", { name: /use woocommerce/i }).click();

  await expect(page.getByText("remote")).toBeVisible();
  await expect(page.getByText(/Status: resolved/)).toBeVisible();
});
