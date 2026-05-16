import { expect, type Page } from "@playwright/test";
import { resolveAdminURL, resolveLoginURL } from "./auth-url";

type AdminRole = "admin" | "operator" | "viewer";

export async function signInViaUI(page: Page, role: AdminRole = "operator"): Promise<void> {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(`${role}@example.com`);
  await page.getByLabel(/password/i).fill(`${role}-password`);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/admin/, { timeout: 60_000 });
}

export async function signInAs(page: Page, role: AdminRole = "operator"): Promise<void> {
  const response = await page.request.post(resolveLoginURL(page.url()), {
    headers: { accept: "application/json", "content-type": "application/json" },
    data: {
      email: `${role}@example.com`,
      password: `${role}-password`,
    },
  });

  expect(response.ok()).toBe(true);

  await page.goto(resolveAdminURL(page.url()));
  await expect(page).toHaveURL(/\/admin/, { timeout: 60_000 });
}
