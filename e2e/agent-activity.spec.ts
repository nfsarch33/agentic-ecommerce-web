import { expect, test } from "@playwright/test";

// E2E for the v3.6.0 EC-9-2 agent activity page. The mock backend
// returned by run-with-mock.ts does not implement the SSE upstream
// (the real backend handler is unit-tested with goleak). This spec
// verifies that the page renders the empty state, the connection
// badge, and the heading -- enough to catch regressions in the
// page wiring + BFF route shape.
test("agent activity page renders the live feed shell", async ({ page }) => {
  await page.goto("/agent-activity");
  await expect(page.getByRole("heading", { level: 1, name: /Agent activity/i })).toBeVisible();
  await expect(page.getByTestId("agent-activity-state")).toBeVisible();
  await expect(page.getByTestId("agent-activity-empty")).toBeVisible();
});
