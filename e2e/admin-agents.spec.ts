import { expect, test } from "@playwright/test";

test("admin agents dashboard renders history and triggers a manual run", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());

  await page.goto("/admin/agents");

  await expect(page.getByRole("heading", { name: "Agent Dashboard" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sourcing Agent" })).toBeVisible();
  await expect(page.getByText("100% success")).toBeVisible();
  await expect(page.getByText("0 queued")).toBeVisible();

  await page.getByRole("button", { name: /show history for sourcing agent/i }).click();
  await expect(page.getByText("Completed with result: scores, top_candidate.")).toBeVisible();
  await expect(page.locator("pre").filter({ hasText: '"top_candidate"' })).toContainText('"sku": "RB-SET"');

  await page.getByRole("button", { name: /run sourcing agent now/i }).click();
  await expect(page.getByRole("status")).toContainText("Queued manual run");
  await expect(page.getByText("Run queued.")).toBeVisible();
});
