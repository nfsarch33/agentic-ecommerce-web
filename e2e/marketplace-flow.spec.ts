import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers/auth";

// v2.4.0 marketplace plugin framework E2E.
// Mock API endpoint defaults (127.0.0.1:18080) match the
// membership-flow.spec.ts pattern so CI's `bun run test:e2e`
// runs without per-spec port wiring.

test.describe("v2.4.0 marketplace flow", () => {
  test("super-admin provisions a tenant and runs the marketplace lifecycle", async ({ page }) => {
    await signInAs(page, "admin");

    // Provision tenant via the wizard.
    await page.goto("/admin/tenants/new");
    await expect(page.getByTestId("tenant-wizard")).toBeVisible();
    const slug = `acme-${Date.now()}`;
    await page.getByTestId("tenant-wizard-slug").fill(slug);
    await page.getByTestId("tenant-wizard-name").fill("Acme Corp");
    await expect(page.getByTestId("tenant-wizard-slug-ok")).toBeVisible();
    await page.getByTestId("tenant-wizard-next").click();
    await expect(page.getByTestId("tenant-wizard-preview-slug")).toHaveText(slug);
    await page.getByTestId("tenant-wizard-submit").click();
    await page.waitForURL(/\/admin\/tenants\//);

    // Tenant appears with status=provisioning; admin activates it.
    await page.goto("/admin/tenants");
    await expect(page.getByTestId(`tenant-row-${slug}`)).toBeVisible();
    await page.getByTestId(`tenant-action-activate-${slug}`).click();
    await expect(
      page.locator(`[data-testid=tenant-row-${slug}] [data-testid=tenant-status-active]`),
    ).toBeVisible();

    // Browse marketplace, install + activate + deactivate + uninstall.
    await page.goto("/admin/marketplace");
    await expect(page.getByRole("heading", { name: /Marketplace/i })).toBeVisible();
    await expect(page.getByTestId("plugin-card-stripe-payments")).toBeVisible();

    // Filter via search to validate UX wiring.
    await page.getByTestId("marketplace-search").fill("stripe");
    await expect(page.getByTestId("plugin-card-stripe-payments")).toBeVisible();
    await page.getByTestId("marketplace-search").fill("");

    await page.goto("/admin/marketplace/stripe-payments");
    await expect(page.getByTestId("plugin-detail-stripe-payments")).toBeVisible();

    // Drive the lifecycle through the in-page buttons. Each click
    // mutates the local installation state so the next button
    // renders without a page reload.
    await page.getByTestId("plugin-action-install-stripe-payments").click();
    await expect(page.getByTestId("installation-status-installed")).toBeVisible();
    await page.getByTestId("plugin-action-activate-stripe-payments").click();
    await expect(page.getByTestId("installation-status-active")).toBeVisible();
    await page.getByTestId("plugin-action-deactivate-stripe-payments").click();
    await expect(page.getByTestId("installation-status-deactivated")).toBeVisible();
    await page.getByTestId("plugin-action-uninstall-stripe-payments").click();
    // After uninstall the row is removed; the install button returns.
    await expect(page.getByTestId("plugin-action-install-stripe-payments")).toBeVisible();
  });

  test("marketplace catalogue empties when search has no matches", async ({ page }) => {
    await signInAs(page, "admin");
    await page.goto("/admin/marketplace");
    await page.getByTestId("marketplace-search").fill("definitely-not-a-plugin");
    await expect(page.getByTestId("marketplace-empty")).toBeVisible();
  });

  test("tenant wizard rejects invalid slug input", async ({ page }) => {
    await signInAs(page, "admin");
    await page.goto("/admin/tenants/new");
    await page.getByTestId("tenant-wizard-slug").fill("INVALID");
    await expect(page.getByTestId("tenant-wizard-slug-error")).toBeVisible();
    await expect(page.getByTestId("tenant-wizard-next")).toBeDisabled();
  });
});
