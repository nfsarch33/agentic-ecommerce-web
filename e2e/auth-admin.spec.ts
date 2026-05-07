import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers/auth";

test("unauthenticated admin visits redirect to login", async ({ page }) => {
  await page.goto("/admin");

  await expect(page).toHaveURL(/\/login\?next=\/admin/);
  await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
});

test("login opens the admin dashboard and applies role-limited navigation", async ({ page }) => {
  await signInAs(page, "viewer");

  await expect(page).toHaveURL(/\/admin/);
  await expect(page.getByRole("heading", { name: /admin dashboard/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "Products", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /settings/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /agents/i })).toHaveCount(0);
  await expect(page.getByText(/viewer access/i)).toBeVisible();
});

test("viewer cannot see product mutation controls", async ({ page }) => {
  await signInAs(page, "viewer");
  await page.goto("/admin/products");

  await expect(page).toHaveURL(/\/admin\/products/);
  await expect(page.getByText(/view-only access/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /create product/i })).toHaveCount(0);
});
