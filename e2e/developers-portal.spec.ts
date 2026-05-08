import { test, expect } from "@playwright/test";

test.describe("Developers portal", () => {
  test("/developers renders the portal cards", async ({ page }) => {
    await page.goto("/developers");
    await expect(page.getByTestId("developers-portal")).toBeVisible();
    await expect(page.getByTestId("developer-card-getting-started")).toBeVisible();
    await expect(page.getByTestId("developer-card-sdk")).toBeVisible();
    await expect(page.getByTestId("developer-card-api")).toBeVisible();
  });

  test("/developers/api renders the v1 + v2 reference sections", async ({ page }) => {
    await page.goto("/developers/api");
    await expect(page.getByTestId("developer-api-reference")).toBeVisible();
    await expect(page.getByTestId("developer-api-v1")).toBeVisible();
    await expect(page.getByTestId("developer-api-v2")).toBeVisible();
  });

  test("/developers/sdk renders the symbol table and example", async ({ page }) => {
    await page.goto("/developers/sdk");
    await expect(page.getByTestId("sdk-symbols")).toBeVisible();
    await expect(page.getByTestId("sdk-example")).toBeVisible();
  });

  test("/developers/getting-started renders the step list", async ({ page }) => {
    await page.goto("/developers/getting-started");
    await expect(page.getByTestId("getting-started-steps")).toBeVisible();
    await expect(page.getByTestId("getting-started-step-register-tenant")).toBeVisible();
  });
});
