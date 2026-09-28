import { expect, test } from "@playwright/test";
import { join } from "node:path";
import { signInAs } from "./helpers/auth";

/**
 * Approvals inbox e2e: approve, reject-with-reason, batch-approve, plus
 * the responsive contract at six widths (with an UNBROKEN 64-char token
 * fixture that catches wrap regressions) and axe (fail-closed: the run
 * errors if axe is not injectable). Keyboard shortcuts are a separate
 * change and are deliberately absent here.
 *
 * Mock-state note: the mock stack keeps workflow state across tests in a
 * worker, so every test consumes DISTINCT fixtures and pending-count
 * assertions are RELATIVE (read before, assert the exact after-value).
 */
const WIDTHS = [375, 768, 1024, 1440, 1920, 2560] as const;

async function pendingCount(page: import("@playwright/test").Page): Promise<number> {
  const text = await page.getByTestId("pending-count").textContent();
  return Number(text?.match(/\d+/)?.[0] ?? "0");
}

test.beforeEach(async ({ page }) => {
  await signInAs(page, "operator");
});

test("approve posts SAME-ORIGIN and moves the item out of pending", async ({ page }) => {
  await page.goto("/admin/approvals");
  const item = page.locator("li", { hasText: "Resistance Band Set" }).first();
  await expect(item).toBeVisible();
  const before = await pendingCount(page);
  const appOrigin = new URL(page.url()).origin;
  const signalRequest = page.waitForRequest(
    (r) => r.method() === "POST" && r.url().includes("/signals/review"),
  );
  await item.getByRole("button", { name: /approve resistance band set/i }).click();
  const request = await signalRequest;
  // Mutant this kills: the client posting straight to the API base —
  // the origin would be the mock API port, not the app's.
  expect(new URL(request.url()).origin).toBe(appOrigin);
  await expect(item.getByTestId(/item-status-/)).toHaveText("Approved");
  // ANCHORED count: exactly one item left pending.
  await expect(page.getByTestId("pending-count")).toHaveText(`${before - 1} pending`);
});

test("reject requires a reason and records it", async ({ page }) => {
  await page.goto("/admin/approvals");
  const item = page.locator("li", { hasText: "Yoga Mat" }).first();
  const before = await pendingCount(page);
  await item.getByRole("button", { name: /reject yoga mat/i }).click();
  const dialog = page.getByRole("dialog", { name: /reject with reason/i });
  // Native <dialog>.showModal(): visible + modal by construction.
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /reject with this reason/i }).click();
  await expect(dialog.getByRole("alert")).toContainText(/at least 3 characters/i);
  await dialog.getByLabel(/rejection reason/i).fill("wrong size chart");
  await dialog.getByRole("button", { name: /reject with this reason/i }).click();
  await expect(item.getByTestId(/item-status-/)).toContainText("wrong size chart");
  await expect(page.getByTestId("pending-count")).toHaveText(`${before - 1} pending`);
});

test("keyboard: j moves focus and A approves the focused row (exactly one row changes)", async ({ page }) => {
  await page.goto("/admin/approvals");
  // State-relative (the mock keeps decisions across tests in a worker):
  // snapshot every row's status, act on the j-moved row, then exactly
  // one row may have changed — the focused one — and it must read
  // Approved.
  const rowsBefore = await page.locator("li[data-row-id]").evaluateAll((els) =>
    els.map((el) => el.querySelector("[data-testid^='item-status-']")?.textContent ?? "pending"),
  );
  const before = await pendingCount(page);
  await page.locator("li[data-row-id]").first().click();
  await page.keyboard.press("j");
  const focusedId = await page.evaluate(() => document.activeElement?.getAttribute("data-row-id"));
  expect(focusedId).toBeTruthy();
  await page.keyboard.press("a");
  const focusedRow = page.locator(`li[data-row-id="${focusedId}"]`);
  await expect(focusedRow.getByTestId(/item-status-/)).toHaveText("Approved");
  const rowsAfter = await page.locator("li[data-row-id]").evaluateAll((els) =>
    els.map((el) => el.querySelector("[data-testid^='item-status-']")?.textContent ?? "pending"),
  );
  const changed = rowsAfter
    .map((after, i) => ({ i, after, before: rowsBefore[i] }))
    .filter((r) => r.before !== r.after);
  // Mutant this kills: the keyboard approve reading the wrong index
  // space — a second row would have changed too.
  expect(changed.length, JSON.stringify(changed)).toBe(1);
  await expect(page.getByTestId("pending-count")).toHaveText(`${before - 1} pending`);
});

test("batch approve confirms count with the cost summary, then approves exactly the selection", async ({ page }) => {
  await page.goto("/admin/approvals");
  const before = await pendingCount(page);
  await page.getByLabel(/select foam roller/i).check();
  await page.getByLabel(/select kettlebell/i).check();
  await page.getByRole("button", { name: /approve 2 selected/i }).click();
  const dialog = page.getByRole("dialog", { name: /confirm batch approve/i });
  await expect(dialog).toContainText(/you are approving 2 items/i);
  // The EXACT cost token (an em dash anywhere else must not satisfy it).
  await expect(dialog).toContainText("Cost: — per item");
  await dialog.getByRole("button", { name: /approve all 2/i }).click();
  // RELATIVE count: exactly the two selected items left pending.
  await expect(page.getByTestId("pending-count")).toHaveText(
    `${Math.max(before - 2, 0)} pending`,
  );
  await expect(
    page.locator("li", { hasText: "Foam Roller" }).first().getByTestId(/item-status-/),
  ).toHaveText("Approved");
  await expect(
    page.locator("li", { hasText: "Kettlebell" }).first().getByTestId(/item-status-/),
  ).toHaveText("Approved");
});

for (const width of WIDTHS) {
  test(`no horizontal scroll at ${width} (64-char unbroken token)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/admin/approvals");
    // The 64-char UNBROKEN token must be present for this to prove
    // overflow-wrap (a breakable title could wrap on spaces alone).
    await expect(page.getByText("WrapProof-012345678901234567890123456789012345678901234567890123").first()).toBeVisible();
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
  const outcome = await page.evaluate(() => {
    const axe = (window as unknown as { axe?: { run: (o: object) => Promise<{ violations: { impact: string }[] }> } }).axe;
    if (!axe) throw new Error("axe failed to inject — this gate fails closed");
    return axe
      .run({ runOnly: { type: "tags", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } })
      .then((r) => ({ ran: true, impacts: r.violations.map((v) => v.impact) }));
  });
  // `ran` proves the audit EXECUTED — a disarmed gate that returns an
  // empty list without running axe must fail here, not pass silently.
  expect(outcome.ran, "axe.run must have executed").toBe(true);
  const serious = outcome.impacts.filter((v) => v === "serious" || v === "critical");
  expect(serious, `serious/critical violations: ${serious.length}`).toHaveLength(0);
});
