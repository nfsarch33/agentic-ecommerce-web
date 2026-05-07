import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers/auth";

test("admin dashboard renders recent backend event activity", async ({ page }) => {
  await signInAs(page, "admin");
  await page.goto("/admin");

  await expect(page.getByRole("heading", { name: "Recent Activity" })).toBeVisible();
  await expect(page.getByText("Compliance Checked")).toBeVisible();
  await expect(page.getByText("Compliance check needs review")).toBeVisible();
  await expect(page.getByText("Product Created")).toBeVisible();
});
