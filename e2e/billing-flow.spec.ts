import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers/auth";

// v2.5.0 admin billing surface E2E. Asserts the dashboard renders the
// seeded subscription, drives pause/resume/cancel transitions through
// the mock API at 127.0.0.1:18080, and confirms the invoices and
// usage rollup pages.

test.describe("v2.5.0 billing flow", () => {
  test("admin pauses, resumes, cancels a subscription", async ({ page }) => {
    await signInAs(page, "admin");
    await page.goto("/admin/billing");
    await expect(page.getByTestId("billing-dashboard")).toBeVisible();
    await expect(page.getByTestId("subscription-sub_e2e_1")).toBeVisible();
    await expect(page.getByTestId("subscription-status-active")).toBeVisible();

    await page.getByTestId("subscription-pause-sub_e2e_1").click();
    await expect(page.getByTestId("subscription-status-paused")).toBeVisible();

    await page.getByTestId("subscription-resume-sub_e2e_1").click();
    await expect(page.getByTestId("subscription-status-active")).toBeVisible();

    await page.getByTestId("subscription-cancel-sub_e2e_1").click();
    await expect(page.getByTestId("subscription-status-canceled")).toBeVisible();
  });

  test("invoices page lists invoices", async ({ page }) => {
    await signInAs(page, "admin");
    await page.goto("/admin/billing/invoices");
    await expect(page.getByTestId("billing-invoices-page")).toBeVisible();
    await expect(page.getByTestId("invoice-row-inv_e2e_1")).toBeVisible();
  });

  test("usage page renders rollups with progress bars", async ({ page }) => {
    await signInAs(page, "admin");
    await page.goto("/admin/billing/usage");
    await expect(page.getByTestId("billing-usage-page")).toBeVisible();
    await expect(page.getByTestId("usage-api.requests")).toBeVisible();
    await expect(page.getByTestId("usage-agent.runs")).toBeVisible();
    await expect(page.getByTestId("usage-storage.bytes")).toBeVisible();
  });
});
