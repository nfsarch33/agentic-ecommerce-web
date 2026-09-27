import { expect, test } from "@playwright/test";
import { join } from "node:path";
import { signInAs } from "./helpers/auth";

/**
 * Approvals inbox e2e, per the design note: approve, reject-with-reason,
 * batch-approve, keyboard path, plus the responsive contract at six
 * widths (with a 64-char title fixture that catches wrap regressions)
 * and axe (fail-closed: the run errors if axe is not injectable).
 *
 * Mock-state note: the mock stack keeps workflow state across tests in a
 * worker, so every test consumes DISTINCT fixtures and pending-count
 * assertions are RELATIVE (read before, assert after).
 */
const WIDTHS = [375, 768, 1024, 1440, 1920, 2560] as const;

test.beforeEach(async ({ page }) => {
  await signInAs(page, "operator");
});

test("approve moves the item out of pending", async ({ page }) => {
  await page.goto("/admin/approvals");
  const item = page.locator("li", { hasText: "Resistance Band Set" }).first();
  await expect(item).toBeVisible();
  const before = await page.getByTestId("pending-count").textContent();
  await item.getByRole("button", { name: /approve resistance band set/i }).click();
  await expect(item.getByTestId(/item-status-/)).toHaveText(/approved/i);
  await expect(page.getByTestId("pending-count")).not.toHaveText(before!);
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

test("batch approve confirms count with the cost summary, then approves exactly the selection", async ({ page }) => {
  await page.goto("/admin/approvals");
  const before = Number(
    (await page.getByTestId("pending-count").textContent())?.match(/\d+/)?.[0] ?? "0",
  );
  await page.getByLabel(/select foam roller/i).check();
  await page.getByLabel(/select kettlebell/i).check();
  await page.getByRole("button", { name: /approve 2 selected/i }).click();
  const dialog = page.getByRole("dialog", { name: /confirm batch approve/i });
  await expect(dialog).toContainText(/you are approving 2 items/i);
  // The cost summary is part of the confirmation.
  await expect(dialog).toContainText(/cost/i);
  await expect(dialog).toContainText(/—/);
  await dialog.getByRole("button", { name: /approve all 2/i }).click();
  // RELATIVE count: exactly the two selected items left pending.
  await expect(page.getByTestId("pending-count")).toHaveText(
    new RegExp(`${Math.max(before - 2, 0)} pending`),
  );
  await expect(
    page.locator("li", { hasText: "Foam Roller" }).first().getByTestId(/item-status-/),
  ).toHaveText(/approved/i);
  await expect(
    page.locator("li", { hasText: "Kettlebell" }).first().getByTestId(/item-status-/),
  ).toHaveText(/approved/i);
});

test("keyboard: focus is visible, Enter previews the focused item", async ({ page }) => {
  await page.goto("/admin/approvals");
  const inbox = page.getByTestId("approvals-inbox");
  await inbox.focus();
  // Mock state persists across tests in this worker, so this test uses
  // the never-consumed long-title fixture and asserts the FIRST item —
  // focus presence, not a specific index.
  const first = page.locator("li").first();
  await expect(first).toBeVisible();
  await expect(first).toHaveAttribute("data-focused", "true");
  await inbox.press("j");
  await inbox.press("k");
  await expect(first).toHaveAttribute("data-focused", "true");
  await inbox.press("Enter");
  await expect(page.getByRole("dialog", { name: /preview item/i })).toBeVisible();
  await page.getByRole("button", { name: /close preview/i }).click();
});

for (const width of WIDTHS) {
  test(`no horizontal scroll at ${width} (64-char fixture)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/admin/approvals");
    // The long-title fixture must be present for this to prove wrap.
    await expect(page.getByText(/Unreasonably Long Product Title/i).first()).toBeVisible();
    const overflowed = await page.evaluate(
      () =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth > 1,
    );
    expect(overflowed, `horizontal scroll at ${width}`).toBe(false);
  });
}

test("axe: 0 serious violations at 1280 (fail-closed)", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/admin/approvals");
  // Inject axe ourselves; if the injection fails the evaluate below
  // throws — this test never passes on a missing axe.
  await page.addScriptTag({
    path: join(process.cwd(), "node_modules", "axe-core", "axe.min.js"),
  });
  const violations = await page.evaluate(() => {
    const axe = (window as unknown as { axe?: { run: (o: object) => Promise<{ violations: { impact: string }[] }> } }).axe;
    if (!axe) throw new Error("axe failed to inject — this gate fails closed");
    return axe
      .run({ runOnly: { type: "tags", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } })
      .then((r) => r.violations.map((v) => v.impact));
  });
  const serious = violations.filter((v) => v === "serious" || v === "critical");
  expect(serious, `serious/critical violations: ${serious.length}`).toHaveLength(0);
});
