import { test, expect } from "@playwright/test";

test.describe("Payment dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/payments**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          payments: [
            {
              payment_id: "p1",
              tenant_id: "t1",
              order_id: "o1",
              provider: "stripe",
              status: "succeeded",
              amount_cents: 5000,
              currency: "AUD",
              created_at: "2026-05-10T01:00:00Z",
            },
            {
              payment_id: "p2",
              tenant_id: "t1",
              order_id: "o2",
              provider: "paypal",
              status: "pending",
              amount_cents: 3000,
              currency: "AUD",
              created_at: "2026-05-10T02:00:00Z",
            },
            {
              payment_id: "p3",
              tenant_id: "t1",
              order_id: "o3",
              provider: "alipay",
              status: "succeeded",
              amount_cents: 8000,
              currency: "CNY",
              created_at: "2026-05-10T03:00:00Z",
            },
          ],
          total: 3,
          limit: 50,
          offset: 0,
        }),
      }),
    );
  });

  test("renders table with 3 providers", async ({ page }) => {
    await page.goto("/payments");
    await expect(page.getByText("3 payments")).toBeVisible();
    await expect(page.getByText("p1")).toBeVisible();
    await expect(page.getByText("p2")).toBeVisible();
    await expect(page.getByText("p3")).toBeVisible();
  });

  test("shows provider names", async ({ page }) => {
    await page.goto("/payments");
    const table = page.locator("table");
    await expect(table.getByText("stripe")).toBeVisible();
    await expect(table.getByText("paypal")).toBeVisible();
    await expect(table.getByText("alipay")).toBeVisible();
  });

  test("shows status badges", async ({ page }) => {
    await page.goto("/payments");
    const table = page.locator("table");
    await expect(table.locator("text=succeeded").first()).toBeVisible();
    await expect(table.getByText("pending")).toBeVisible();
  });

  test("has provider filter dropdown", async ({ page }) => {
    await page.goto("/payments");
    await expect(page.getByLabel("Filter by provider")).toBeVisible();
  });

  test("has status filter dropdown", async ({ page }) => {
    await page.goto("/payments");
    await expect(page.getByLabel("Filter by status")).toBeVisible();
  });
});
