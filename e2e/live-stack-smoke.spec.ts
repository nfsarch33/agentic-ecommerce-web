import { expect, test } from "@playwright/test";

const apiBaseUrl =
  process.env.MC_API_BASE_URL ?? process.env.NEXT_PUBLIC_MC_API_BASE_URL ?? "http://127.0.0.1:8080";

test.skip(
  process.env.E2E_LIVE_STACK !== "true",
  "set E2E_LIVE_STACK=true to target the local compose stack",
);

test("local stack smoke verifies frontend and backend health", async ({ page, request }) => {
  const apiHealth = await request.get(`${apiBaseUrl}/healthz`);
  expect(apiHealth.ok()).toBeTruthy();

  const apiReady = await request.get(`${apiBaseUrl}/readyz`);
  expect(apiReady.ok()).toBeTruthy();

  await page.goto("/");
  await expect(page.getByRole("heading", { name: /agentic ecommerce/i })).toBeVisible();

  const frontendReady = await request.get("/readyz");
  expect(frontendReady.ok()).toBeTruthy();
});
