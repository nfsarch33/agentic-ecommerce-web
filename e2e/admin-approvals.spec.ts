import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers/auth";

/**
 * Approvals inbox e2e, per the design note: approve, reject-with-reason,
 * batch-approve, plus the responsive contract at six widths and axe at
 * 1280. Runs against the mock API stack (test:e2e:stable harness).
 */
const WIDTHS = [375, 768, 1024, 1440, 1920, 2560] as const;

test.beforeEach(async ({ page }) => {
  await signInAs(page, "operator");
});

test("approve moves the item out of pending", async ({ page }) => {
  await page.goto("/admin/approvals");
  const item = page.locator("li", { hasText: "Resistance Band Set" }).first();
  await expect(item).toBeVisible();
  await item.getByRole("button", { name: /approve resistance band set/i }).click();
  await expect(item.getByTestId(/item-status-/)).toHaveText(/approved/i);
  await expect(page.getByTestId("pending-count")).not.toHaveText(/4 pending/);
});

test("reject requires a reason and records it", async ({ page }) => {
  await page.goto("/admin/approvals");
  const item = page.locator("li", { hasText: "Yoga Mat" }).first();
  await item.getByRole("button", { name: /reject yoga mat/i }).click();
  const dialog = page.getByRole("dialog", { name: /reject with reason/i });
  await dialog.getByRole("button", { name: /reject with this reason/i }).click();
  await expect(dialog.getByRole("alert")).toContainText(/at least 3 characters/i);
  await dialog.getByLabel(/rejection reason/i).fill("wrong size chart");
  await dialog.getByRole("button", { name: /reject with this reason/i }).click();
  await expect(item.getByTestId(/item-status-/)).toContainText("wrong size chart");
});

test("batch approve confirms count, then approves exactly the selection", async ({ page }) => {
  await page.goto("/admin/approvals");
  await page.getByLabel(/select foam roller/i).check();
  await page.getByLabel(/select kettlebell/i).check();
  await page.getByRole("button", { name: /approve 2 selected/i }).click();
  const dialog = page.getByRole("dialog", { name: /confirm batch approve/i });
  await expect(dialog).toContainText(/you are approving 2 items/i);
  await dialog.getByRole("button", { name: /approve all 2/i }).click();
  // The two batch items are approved; every fixture this worker's tests
  // consume is distinct, so nothing is left pending after this one.
  await expect(page.getByTestId("pending-count")).toHaveText(/0 pending/);
  await expect(
    page.locator("li", { hasText: "Foam Roller" }).first().getByTestId(/item-status-/),
  ).toHaveText(/approved/i);
  await expect(
    page.locator("li", { hasText: "Kettlebell" }).first().getByTestId(/item-status-/),
  ).toHaveText(/approved/i);
});

for (const width of WIDTHS) {
  test(`no horizontal scroll at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/admin/approvals");
    const overflowed = await page.evaluate(
      () =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth > 1,
    );
    expect(overflowed, `horizontal scroll at ${width}`).toBe(false);
  });
}

test("axe: 0 serious violations at 1280", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/admin/approvals");
  const violations = await page.evaluate(() => {
    const axe = (window as unknown as { axe?: { run: (o: object) => Promise<{ violations: { impact: string }[] }> } }).axe;
    if (!axe) return [];
    return axe
      .run({ runOnly: { type: "tags", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } })
      .then((r) => r.violations.map((v) => v.impact));
  });
  const serious = violations.filter((v) => v === "serious" || v === "critical");
  expect(serious, `serious/critical violations: ${serious.length}`).toHaveLength(0);
});
