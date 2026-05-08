import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers/auth";

test.describe("v2.2.0 membership flow", () => {
  test("admin reviews plans, sees memberships list, and cancels a subscriber", async ({ page }) => {
    await signInAs(page, "operator");

    // Plan view from admin
    await page.goto("/admin/membership-plans");
    await expect(page.getByRole("heading", { name: /Membership Plans/i })).toBeVisible();
    await expect(page.getByText("Pro Monthly")).toBeVisible();

    // Customer joins via storefront /account/membership.
    // We do this by hitting the public adapter directly (POST /api/v1/memberships)
    // because the storefront checkout button is a Stripe stub for v2.2.0.
    const create = await page.request.post("http://127.0.0.1:18180/api/v1/memberships", {
      headers: { "x-tenant-id": "tenant_default", "content-type": "application/json" },
      data: { member_email: "operator@example.com", plan_id: "plan_pro_monthly" },
    });
    expect(create.ok()).toBe(true);
    const created = await create.json();
    expect(created.state).toBe("active");

    // Admin sees the new member. The user email also appears in the
    // sidebar; scope the assertion to the membership row to keep it
    // strict-mode safe.
    await page.goto("/admin/memberships");
    await expect(page.getByRole("heading", { name: /Memberships/i })).toBeVisible();
    const memberLink = page.getByRole("main").getByRole("link", {
      name: "operator@example.com",
    });
    await expect(memberLink).toBeVisible();
    await expect(page.getByTestId("membership-status-active").first()).toBeVisible();

    // Admin cancels the membership.
    await page.getByTestId(`membership-action-cancel`).first().click();
    await expect(page.getByTestId("membership-status-cancelled").first()).toBeVisible();
  });

  test("storefront /account/membership shows existing membership for the signed-in user", async ({
    page,
  }) => {
    await signInAs(page, "operator");

    // Seed an active membership for operator@example.com via API.
    await page.request.post("http://127.0.0.1:18180/api/v1/memberships", {
      headers: { "x-tenant-id": "tenant_default", "content-type": "application/json" },
      data: { member_email: "operator@example.com", plan_id: "plan_pro_monthly" },
    });

    await page.goto("/account/membership");
    await expect(page.getByRole("heading", { name: /My membership/i })).toBeVisible();
    await expect(page.getByTestId("membership-status-active").first()).toBeVisible();

    // Customer pauses their own membership.
    await page.getByTestId("membership-action-pause").click();
    await expect(page.getByTestId("membership-status-paused").first()).toBeVisible();

    // Resume puts them back to active.
    await page.getByTestId("membership-action-resume").click();
    await expect(page.getByTestId("membership-status-active").first()).toBeVisible();
  });

  test("storefront /account/membership shows join flow when no membership", async ({ page }) => {
    await signInAs(page, "viewer"); // viewer@example.com — not seeded
    await page.goto("/account/membership");
    await expect(page.getByRole("heading", { name: /Join the membership/i })).toBeVisible();
    await expect(page.getByTestId("plan-selector")).toBeVisible();
    await expect(page.getByTestId("customer-membership-checkout")).toBeEnabled();
  });
});
