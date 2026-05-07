import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers/auth";

test("admin updates tenant settings and exports compliance reporting", async ({ page }) => {
  await signInAs(page, "admin");

  await page.goto("/admin/settings/tenant");
  await expect(page.getByLabel(/active tenant/i)).toHaveValue("tenant_default");
  await expect(page.getByText(/single tenant mode/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tenant Settings" })).toBeVisible();
  await expect(page.getByLabel(/display name/i)).toHaveValue(/Demo (Store|Outlet)/);
  await page.getByLabel(/display name/i).fill("Demo Outlet");
  await page.getByRole("button", { name: /save tenant settings/i }).click();
  await expect(page.getByRole("status")).toContainText("Tenant settings saved.");

  await page.goto("/admin/compliance");
  await expect(page.getByRole("heading", { name: /compliance reporting/i })).toBeVisible();
  await expect(page.getByText("70% pass rate")).toBeVisible();
  await page.getByRole("button", { name: /export csv/i }).click();
  await expect(page.getByRole("status")).toContainText("Exported compliance-report.csv");
  await page.getByRole("button", { name: /export json/i }).click();
  await expect(page.getByRole("status")).toContainText("Exported compliance-report.json");

  await page.getByRole("button", { name: /create rule/i }).click();
  await expect(page.getByText(/rule\.(id|code)|must be non-empty/i)).toBeVisible();

  await page.getByLabel(/rule name/i).fill("SEO title guardrail");
  await page.getByLabel(/rule code/i).fill("seo.title_length");
  await page.getByLabel(/description/i).fill("Require clear SEO titles.");
  await page.getByLabel(/field/i).fill("title");
  await page.getByLabel(/value/i).fill("sale");
  await page.getByRole("button", { name: /create rule/i }).click();
  await expect(page.getByText("SEO title guardrail")).toBeVisible();
  const ruleCard = page.getByRole("article", { name: /seo title guardrail/i });
  await ruleCard.getByRole("button", { name: /disable/i }).click();
  await expect(page.getByRole("status")).toContainText("Custom rule disabled.");
});
