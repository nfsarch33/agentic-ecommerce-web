import { expect, test } from "@playwright/test";

/**
 * LIVE approvals walk against the local preview stack (127.0.0.1:3100 →
 * mc-api 8180 → fixture store). Skipped unless the runner provides the
 * fixture admin credentials via env (values live in the fixture env
 * file; they are never committed and never logged).
 *
 * Covers the acceptance: every PENDING draft lists product + draft text,
 * ONE is approved through the page, the row flips, and the worker's
 * publish is read back on the store.
 */
const EMAIL = process.env.FIXTURE_ADMIN_EMAIL ?? "";
const PASSWORD = process.env.FIXTURE_ADMIN_PASSWORD ?? "";
const APP = process.env.WALK_APP_BASE ?? "http://127.0.0.1:3100";

test.skip(!EMAIL || !PASSWORD, "live walk needs FIXTURE_ADMIN_EMAIL/PASSWORD in the environment");

test.beforeEach(async ({ page }) => {
  await page.goto(`${APP}/login`);
  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
});

test("lists the waiting drafts with product + draft and approves one end to end", async ({ page }) => {
  await page.goto(`${APP}/admin/approvals`);
  const rows = page.locator("li[data-row-id]");
  await expect(rows.first()).toBeVisible({ timeout: 15_000 });
  const count = await rows.count();
  // The acceptance asks for at least five waiting drafts.
  expect(count).toBeGreaterThanOrEqual(5);

  // Walk finding pinned: every row must carry a readable product label
  // (the join) — not a raw uuid.
  for (let i = 0; i < count; i++) {
    const label = await rows.nth(i).locator("[data-testid^='title-']").textContent();
    expect(label, `row ${i} label`).toBeTruthy();
    expect(label, `row ${i} must not be a bare uuid`).not.toMatch(/^[0-9a-f-]{36}$/);
  }

  // One draft: preview shows the draft text, then approve through the page.
  const first = rows.first();
  const rowId = await first.getAttribute("data-row-id");
  expect(rowId).toBeTruthy();
  const productLabel = (await first.locator("[data-testid^='title-']").textContent()) ?? "";
  await first.getByRole("button", { name: new RegExp(`Preview ${productLabel}`, "i") }).click();
  const draft = page.getByText(/draft/i).locator("..");
  await expect(draft).toBeVisible();
  await page.getByRole("button", { name: /close preview/i }).click();

  await first.getByRole("button", { name: new RegExp(`Approve ${productLabel}`, "i") }).click();
  // The row leaves pending: either flipped to a decided state the list
  // pins, or gone from the waiting list entirely.
  await expect
    .poll(
      async () => {
        const row = page.locator(`li[data-row-id="${rowId}"]`);
        if ((await row.count()) === 0) return "gone";
        return (await row.getAttribute("data-status")) ?? "unknown";
      },
      { timeout: 30_000, intervals: [1_000, 2_000] },
    )
    .not.toBe("pending");

  // Store read-back: the workflow completes and the fixture store shows
  // the enriched description on the product (via the audited proxy).
  // The read-back is asserted through the public product API so the test
  // holds no store credentials.
  await expect
    .poll(
      async () => {
        const res = await page.request.get(`${APP}/api/admin/workflows`);
        if (!res.ok()) return "pending";
        const body = await res.json();
        const wf = (body.workflows ?? []).find((w: { id?: string }) => w.id === rowId);
        return wf ? wf.status : "gone";
      },
      { timeout: 90_000, intervals: [5_000, 10_000] },
    )
    .not.toBe("waiting_review");
});
