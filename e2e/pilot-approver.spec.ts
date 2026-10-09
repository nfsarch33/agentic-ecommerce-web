import { expect, test, type Page } from "@playwright/test";

/**
 * Pilot-approver isolation e2e: an external pilot approver reaches ONLY
 * their own inbox. Runs against a LIVE two-pilot harness (throwaway
 * instances from the sibling repo's scripts/pilot-instance.sh
 * approver-access-test), which exports the inbox base URL, the pilot
 * approver's credentials and BOTH pilots' workflow ids before invoking
 * this spec — nothing here can run against the mock stack.
 *
 * Rows (each falsifiable on its own):
 *   - browser login as the pilot approver succeeds through /login
 *   - the inbox lists the pilot's OWN waiting item, and the other
 *     pilot's workflow id appears nowhere on the page
 *   - a review for the other pilot's item id, posted from the logged-in
 *     page through this inbox, answers 404 — never 2xx
 */
const email = process.env.PILOT_APPROVER_EMAIL ?? "";
const password = process.env.PILOT_APPROVER_PASSWORD ?? "";
const ownItemId = process.env.PILOT_APPROVER_ITEM_ID ?? "";
const foreignItemId = process.env.PILOT_APPROVER_FOREIGN_ID ?? "";

test.skip(
  process.env.E2E_PILOT_APPROVER !== "true" ||
    !email ||
    !password ||
    !ownItemId ||
    !foreignItemId,
  "set E2E_PILOT_APPROVER=true with PILOT_APPROVER_{EMAIL,PASSWORD,ITEM_ID,FOREIGN_ID} against the live two-pilot harness",
);

async function signInAsPilotApprover(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  // Path-based wait: "/login?next=/admin" would satisfy a naive /admin
  // regex while the browser is still signed out.
  await page.waitForURL((url) => url.pathname.startsWith("/admin"));
}

test("the pilot approver's own item is listed and the other pilot's id is nowhere", async ({ page }) => {
  await signInAsPilotApprover(page);
  await page.goto("/admin/approvals");

  const item = page.locator("li", { hasText: "Resistance Band Set" }).first();
  await expect(item).toBeVisible();

  // The foreign id is this page's whole-tenant leak oracle: a cross-tenant
  // list would have to carry it verbatim.
  await expect(page.locator("body")).not.toContainText(foreignItemId);
});

test("a review for the other pilot's item id answers 404 through this inbox", async ({ page }) => {
  await signInAsPilotApprover(page);

  // page.request shares the browser context's cookies (the signed-in
  // approver session) and lets the test pin the Origin header the review
  // route's same-origin defence checks; an in-page fetch would rely on
  // browser-attached headers the headless shell does not guarantee.
  const origin = new URL(page.url()).origin;
  const response = await page.request.post(`/api/admin/workflows/${foreignItemId}/signals/review`, {
    headers: { "content-type": "application/json", origin },
    data: { signal: "approve" },
  });

  expect(response.status(), await response.text()).toBe(404);
});
