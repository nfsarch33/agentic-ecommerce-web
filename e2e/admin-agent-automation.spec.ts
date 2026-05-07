import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers/auth";

test("admin agents page manages sourcing, pricing, and schedule controls", async ({ page }) => {
  await signInAs(page, "admin");
  await page.goto("/admin/agents");

  await expect(page.getByRole("heading", { name: "Agent Dashboard" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /sourcing recommendations/i })).toBeVisible();
  await expect(page.getByText("Sydney Fitness Supply")).toBeVisible();
  await expect(page.getByRole("link", { name: /view workflow wf_sourcing_1/i })).toBeVisible();

  await page.getByRole("button", { name: /approve sourcing recommendation/i }).click();
  await expect(page.getByRole("status")).toContainText("Sourcing recommendation approved.");

  await page.getByLabel(/target margin for margin guardrail/i).fill("45");
  await page.getByRole("button", { name: /save margin guardrail pricing rule/i }).click();
  await expect(page.getByRole("status")).toContainText("Pricing rule saved.");

  await page.getByLabel(/enable sourcing agent schedule/i).click();
  await expect(page.getByRole("status")).toContainText("Sourcing Agent schedule disabled.");
});
