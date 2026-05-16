import { expect, type Page } from "@playwright/test";

type AdminRole = "admin" | "operator" | "viewer";

async function submitLogin(page: Page, role: AdminRole): Promise<void> {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(`${role}@example.com`);
  await page.getByLabel(/password/i).fill(`${role}-password`);

  const loginResponse = page.waitForResponse((response) => {
    return response.request().method() === "POST" && response.url().includes("/api/auth/login");
  });

  await page.getByRole("button", { name: /sign in/i }).click();
  const response = await loginResponse;
  expect(response.ok()).toBe(true);
}

export async function signInViaUI(page: Page, role: AdminRole = "operator"): Promise<void> {
  await submitLogin(page, role);
  if (!/\/admin(?:[/?#]|$)/.test(page.url())) {
    await page.goto("/admin");
  }
  await expect(page).toHaveURL(/\/admin/, { timeout: 60_000 });
}

export async function signInAs(page: Page, role: AdminRole = "operator"): Promise<void> {
  await signInViaUI(page, role);
}
