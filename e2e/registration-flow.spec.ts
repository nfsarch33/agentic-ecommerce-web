import { expect, test } from "@playwright/test";

// v2.5.0 tenant self-service registration E2E.
// Mock API endpoint defaults to 127.0.0.1:18080 (matches the v2.4.0
// marketplace and v2.2.0 membership specs); CI overrides via
// E2E_MOCK_API_PORT.

test.describe("v2.5.0 registration flow", () => {
  test("submit + verify + onboarding provisions tenant", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByTestId("registration-form")).toBeVisible();
    const slug = `acme-${Date.now()}`;
    await page.getByTestId("register-email").fill("alice@example.com");
    await page.getByTestId("register-slug").fill(slug);
    await page.getByTestId("plan-option-starter").click();
    await page.getByTestId("register-submit").click();
    await expect(page.getByTestId("register-accepted")).toBeVisible();

    // Simulate clicking the verification link from the email so the
    // mock backend transitions pending_email_verification ->
    // email_verified before we hit the onboarding endpoint.
    await page.goto("/register/verify?token=stub-mock-token");
    await expect(page.getByTestId("register-verify-success")).toBeVisible();
    await page.getByTestId("register-verify-continue").click();

    await expect(page.getByTestId("onboarding-form")).toBeVisible();
    await page.getByTestId("onboarding-company").fill("Acme Co");
    await page.getByTestId("onboarding-submit").click();
    await expect(page.getByTestId("onboarding-success")).toBeVisible();
  });

  test("rejects invalid email before submission", async ({ page }) => {
    await page.goto("/register");
    await page.getByTestId("register-email").fill("not-email");
    await expect(page.getByTestId("register-email-error")).toBeVisible();
    await expect(page.getByTestId("register-submit")).toBeDisabled();
  });

  test("rejects bad slug", async ({ page }) => {
    await page.goto("/register");
    await page.getByTestId("register-email").fill("alice@example.com");
    await page.getByTestId("register-slug").fill("BAD CASE");
    await expect(page.getByTestId("register-slug-error")).toBeVisible();
  });
});
