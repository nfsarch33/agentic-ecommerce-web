import type { Page } from "@playwright/test";

export async function signInAs(page: Page, role: "admin" | "operator" | "viewer" = "operator"): Promise<void> {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(`${role}@example.com`);
  await page.getByLabel(/password/i).fill(`${role}-password`);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/admin/);
}
