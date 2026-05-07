import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers/auth";

test.setTimeout(60_000);

test("admin media library sources, filters, edits, and validates media", async ({ page }) => {
  await signInAs(page, "admin");
  await page.goto("/admin/media");

  await expect(page.getByRole("heading", { name: "Media Library" })).toBeVisible();
  await expect(page.getByText("Resistance band hero image")).toBeVisible();
  await expect(page.getByText("QA passed")).toBeVisible();

  await page.getByLabel("Processing status").selectOption("failed");
  await expect(page.getByText("Tiny supplier thumbnail")).toBeVisible();
  await expect(page.getByText("Resistance band hero image")).not.toBeVisible();

  await page.getByLabel("Processing status").selectOption("all");
  await page.getByLabel("Source URL").fill("https://supplier.example/lifestyle.png");
  await page.getByLabel("Title").fill("Lifestyle image");
  await page.getByLabel("Alt text").fill("Athlete using resistance bands at home");
  await page.getByLabel("Tags").fill("lifestyle,home");
  await page.getByRole("button", { name: /source media/i }).click();
  await expect(page.getByText("Lifestyle image")).toBeVisible();

  await page.getByRole("button", { name: /edit lifestyle image/i }).click();
  await page
    .getByRole("region", { name: /metadata editor/i })
    .getByLabel("Title")
    .fill("Updated lifestyle image");
  await page.getByRole("button", { name: /save metadata/i }).click();
  await expect(page.getByText("Updated lifestyle image")).toBeVisible();
});
