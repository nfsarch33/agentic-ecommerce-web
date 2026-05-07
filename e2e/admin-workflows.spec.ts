import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers/auth";

const productId = "018f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c";

test("admin workflows page shows status groups and sends review signal", async ({ page }) => {
  await signInAs(page, "admin");
  await page.goto("/admin/workflows");

  await expect(page.getByRole("heading", { name: "Workflow Status" })).toBeVisible();
  await expect(page.getByRole("region", { name: /running workflows/i }).getByText("Resistance Band Set")).toBeVisible();
  await expect(page.getByText("WooCommerce publish failed")).toBeVisible();

  await page.goto("/admin/workflows/wf_product_publish_1");
  await expect(page.getByRole("heading", { name: /resistance band set workflow/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Check compliance" })).toBeVisible();
  await expect(page.getByText("Waiting for operator approval.")).toBeVisible();

  await page.getByLabel(/review note/i).fill("Approved in mocked E2E");
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByRole("status")).toContainText("Sent approve signal.");
});

test("admin workflow detail shows failed publish state without review actions", async ({ page }) => {
  await signInAs(page, "admin");
  await page.goto("/admin/workflows/wf_product_publish_failed");

  await expect(page.getByRole("heading", { name: /resistance band set workflow/i })).toBeVisible();
  await expect(page.getByText("WooCommerce publish failed")).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve" })).toHaveCount(0);
  await expect(page.getByText(/review signals are available/i)).toBeVisible();
});

test("product content publish button starts a workflow", async ({ page }) => {
  await signInAs(page, "admin");
  await page.goto(`/admin/products/${productId}/content`);

  await page.getByRole("button", { name: /approve suggestion/i }).click();
  await page.getByRole("button", { name: /start publish workflow/i }).click();

  await expect(page.getByRole("status")).toContainText("Publish workflow started.");
  await expect(page.getByRole("link", { name: /view workflow/i })).toBeVisible();
});
