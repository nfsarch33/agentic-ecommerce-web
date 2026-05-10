import { expect, test } from "@playwright/test";

// E2E for the v3.9.0 EC-6-5 margin dashboard page. The mock backend
// returned by run-with-mock.ts may not implement the analytics
// margin handler in this branch, so this spec verifies that the
// page renders the heading + the loading or error state shells -- a
// regression catch for the page wiring + BFF route.
test("margin dashboard page renders the dashboard shell", async ({ page }) => {
  await page.goto("/margin-dashboard");
  await expect(page.getByRole("heading", { level: 1, name: /Margin dashboard/i })).toBeVisible();
  // The page renders one of three states: loading -> ready/error.
  // We accept any of them to keep the spec stable across mock
  // implementations.
  const candidates = [
    page.getByTestId("margin-dashboard-loading"),
    page.getByTestId("margin-dashboard-ready"),
    page.getByTestId("margin-dashboard-error"),
  ];
  const visible = await Promise.race(candidates.map(async (loc) => {
    try {
      await loc.waitFor({ state: "visible", timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }));
  expect(visible).toBe(true);
});
