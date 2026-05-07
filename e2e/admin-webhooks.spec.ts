import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers/auth";

test("admin webhook settings manages n8n automation webhooks", async ({ page }) => {
  await signInAs(page, "admin");
  await page.goto("/admin/settings/webhooks");

  await expect(page.getByRole("heading", { level: 1, name: "Webhooks" })).toBeVisible();
  await expect(page.getByText("Product approved -> Slack notification")).toBeVisible();
  await expect(page.getByText("Order placed -> email confirmation")).toBeVisible();

  await page.getByLabel(/destination url/i).fill("https://hooks.n8n.example/webhook/product-approved");
  await page.getByLabel(/description/i).fill("Product approval Slack alert");
  await page.getByLabel(/signing secret/i).fill("test-secret");
  await page.getByLabel(/product approved/i).check();
  await page.getByRole("button", { name: /register webhook/i }).click();

  await expect(page.getByRole("status")).toContainText("Webhook registered.");
  await expect(page.getByRole("article", { name: /product approval slack alert/i })).toBeVisible();

  await page.getByRole("article", { name: /product approval slack alert/i }).getByRole("button", { name: /send test/i }).click();
  await expect(page.getByRole("status")).toContainText("Test delivery delivered.");

  await page.getByRole("article", { name: /product approval slack alert/i }).getByRole("button", { name: /delete/i }).click();
  await expect(page.getByRole("status")).toContainText("Webhook deleted.");
  await expect(page.getByRole("article", { name: /product approval slack alert/i })).not.toBeVisible();
});
