import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers/auth";

test("admin webhook settings manages n8n automation webhooks", async ({ page }) => {
  await signInAs(page, "admin");
  await page.goto("/admin/settings/webhooks");

  await expect(page.getByRole("heading", { level: 1, name: "Webhooks" })).toBeVisible();
  await expect(page.getByText("Product created -> Slack notification")).toBeVisible();
  await expect(page.getByText("Order placed -> email confirmation")).toBeVisible();
  const n8nUrl = process.env.NEXT_PUBLIC_N8N_URL ?? "https://n8n.example.com";
  if (n8nUrl.trim()) {
    await expect(page.getByRole("link", { name: /open n8n/i })).toBeVisible();
  } else {
    await expect(page.getByRole("link", { name: /open n8n/i })).not.toBeVisible();
  }

  await page
    .getByLabel(/destination url/i)
    .fill("https://hooks.n8n.example/webhook/product-created");
  await page.getByLabel(/signing secret/i).fill("test-secret");
  await page.getByLabel(/product created/i).check();
  await page.getByRole("button", { name: /register webhook/i }).click();

  await expect(page.getByRole("status")).toContainText("Webhook registered.");
  await expect(page.getByRole("article", { name: /product-created/i })).toBeVisible();

  await page
    .getByRole("article", { name: /product-created/i })
    .getByRole("button", { name: /send test/i })
    .click();
  await expect(page.getByRole("status")).toContainText("Test delivery delivered.");

  await page
    .getByRole("article", { name: /product-created/i })
    .getByRole("button", { name: /delete/i })
    .click();
  await expect(page.getByRole("status")).toContainText("Webhook deleted.");
  await expect(page.getByRole("article", { name: /product-created/i })).not.toBeVisible();
});
