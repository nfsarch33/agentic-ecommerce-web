import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers/auth";

test("admin agents dashboard renders current-contract history and triggers a manual run", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());

  await signInAs(page, "operator");
  await page.goto("/admin/agents");

  await expect(page.getByRole("heading", { name: "Agent Dashboard" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sourcing Agent" })).toBeVisible();
  await expect(page.getByText("82% success")).toBeVisible();
  await expect(page.getByText("2 queued")).toBeVisible();

  await page.getByRole("button", { name: /show history for sourcing agent/i }).click();
  await expect(page.getByText("Found three supplier candidates.")).toBeVisible();
  await expect(page.getByText(/"candidates": 3/)).toBeVisible();

  await page.getByRole("button", { name: /run sourcing agent now/i }).click();
  await expect(page.getByRole("status")).toContainText("Queued manual run");
});
