import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers/auth";

test("admin webhook settings manages n8n automation webhooks", async ({ page }) => {
  const destinationUrl = `https://hooks.n8n.example/webhook/product-approved-${Date.now()}`;

  await signInAs(page, "admin");
  await page.goto("/admin/settings/webhooks");

  await expect(page.getByRole("heading", { level: 1, name: "Webhooks" })).toBeVisible();
  await expect(page.getByText("Product approved -> Slack notification")).toBeVisible();
  await expect(page.getByText("Order placed -> email confirmation")).toBeVisible();

  await page.getByLabel(/destination url/i).fill(destinationUrl);
  await page.getByLabel(/signing secret/i).fill("test-secret");
  await page.getByLabel(/product approved/i).check();
  await page.getByRole("button", { name: /register webhook/i }).click();

  await expect(page.getByRole("status")).toContainText("Webhook registered.");
  const registeredWebhook = page.getByRole("article", { name: destinationUrl }).first();
  await expect(registeredWebhook).toBeVisible();
  await expect(registeredWebhook).toContainText(destinationUrl);

  await registeredWebhook.getByRole("button", { name: /send test/i }).click();
  await expect(page.getByRole("status")).toContainText("Test delivery delivered.");

  await registeredWebhook.getByRole("button", { name: /delete/i }).click();
  await expect(page.getByRole("status")).toContainText("Webhook deleted.");
  await expect(page.getByText(destinationUrl)).not.toBeVisible();
});
