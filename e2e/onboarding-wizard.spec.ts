import { expect, test } from "@playwright/test";

// E2E for the v3.9.1 Existing #10 onboarding wizard. The mock backend
// returned by run-with-mock.ts may not implement the onboarding
// endpoints in this branch, so this spec verifies that the page
// renders the heading + the loading/error state shells.
test("onboarding wizard renders the page shell", async ({ page }) => {
  await page.goto("/onboarding");
  await expect(page.getByRole("heading", { level: 1, name: /AI Onboarding Wizard/i })).toBeVisible();
  const candidates = [
    page.getByTestId("onboarding-loading"),
    page.getByTestId("onboarding-step-identity"),
    page.getByTestId("onboarding-error"),
  ];
  const visible = await Promise.race(
    candidates.map(async (loc) => {
      try {
        await loc.waitFor({ state: "visible", timeout: 5000 });
        return true;
      } catch {
        return false;
      }
    }),
  );
  expect(visible).toBe(true);
});

test("operator alert centre page renders the centre shell", async ({ page }) => {
  await page.goto("/operator-alerts");
  await expect(page.getByRole("heading", { level: 1, name: /Operator alert centre/i })).toBeVisible();
  const candidates = [
    page.getByTestId("operator-alerts-loading"),
    page.getByTestId("operator-alerts-list"),
    page.getByTestId("operator-alerts-empty"),
    page.getByTestId("operator-alerts-error"),
  ];
  const visible = await Promise.race(
    candidates.map(async (loc) => {
      try {
        await loc.waitFor({ state: "visible", timeout: 5000 });
        return true;
      } catch {
        return false;
      }
    }),
  );
  expect(visible).toBe(true);
});
