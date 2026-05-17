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
  await expect(page.getByRole("heading", { name: "Lifestyle image", exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: /^edit lifestyle image$/i }).first().click();
  await page.getByRole("region", { name: /metadata editor/i }).getByLabel("Title").fill("Updated lifestyle image");
  await page.getByRole("button", { name: /save metadata/i }).click();
  await expect(page.getByRole("heading", { name: "Updated lifestyle image", exact: true }).first()).toBeVisible();
});

test("admin media library covers empty, error, and loading states", async ({ page }) => {
  await signInAs(page, "admin");
  await page.goto("/admin/media");

  await page.getByLabel("Processing status").selectOption("processing");
  await expect(page.getByText(/No media assets found/i)).toBeVisible();

  await page.getByRole("button", { name: /source media/i }).click();
  await expect(page.getByText(/Add a source URL before sourcing media/i)).toBeVisible();

  await page.getByLabel("Processing status").selectOption("all");
  await page.route("**/api/v1/media/source", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        id: "media_loading_e2e",
        product_id: "018f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c",
        source_url: "https://supplier.example/loading.png",
        alt_text: "Loading state product media",
        metadata: {
          mime_type: "image/png",
          content_length: 180000,
          checksum_sha256: "a".repeat(64),
          width: 1600,
          height: 1200,
        },
        created_at: "2026-05-08T01:15:00Z",
      }),
    });
  });
  await page.getByLabel("Source URL").fill("https://supplier.example/loading.png");
  await page.getByLabel("Title").fill("Loading state image");
  await page.getByLabel("Alt text").fill("Loading state product media");
  await page.getByRole("button", { name: /source media/i }).click();
  await expect(page.getByRole("button", { name: /sourcing/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Loading state image", exact: true })).toBeVisible();
});

test("product content page manages product media panel", async ({ page }) => {
  await signInAs(page, "admin");
  await page.goto("/admin/products/018f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c/content");

  await expect(page.getByRole("heading", { name: "Product media" })).toBeVisible();
  await expect(page.getByText("Resistance band hero image")).toBeVisible();
  const imageEditReview = page.getByRole("region", { name: /image edit variants/i });
  await expect(imageEditReview).toBeVisible();
  await expect(imageEditReview.getByText("Lifestyle edit variant")).toBeVisible();
  await expect(imageEditReview.getByText("Pending approval")).toBeVisible();
  await expect(page.getByRole("button", { name: /process lifestyle edit variant/i })).toBeDisabled();
  await imageEditReview.getByRole("button", { name: /approve lifestyle edit variant/i }).click();
  await expect(imageEditReview.getByText("Approved for publish")).toBeVisible();

  await page.getByRole("button", { name: /validate resistance band hero image/i }).click();
  await expect(page.getByText("Media validation complete.")).toBeVisible();
  await expect(page.getByText("QA passed")).toBeVisible();

  await page.getByLabel("Source URL").fill("https://supplier.example/panel.png");
  await page.getByLabel("Title").fill("Panel lifestyle image");
  await page.getByLabel("Alt text").fill("Panel image showing resistance bands in use");
  await page.getByRole("button", { name: /add product media/i }).click();
  await expect(page.getByText("Panel lifestyle image")).toBeVisible();
});
