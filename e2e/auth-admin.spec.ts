import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers/auth";

test("login opens the admin dashboard and applies role-limited navigation", async ({ page }) => {
  await signInAs(page, "viewer");

  await expect(page).toHaveURL(/\/admin/);
  await expect(page.getByRole("heading", { name: /admin dashboard/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "Products", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /settings/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /agents/i })).toHaveCount(0);
  await expect(page.getByText(/viewer access/i)).toBeVisible();
});
